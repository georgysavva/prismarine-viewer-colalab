/* global THREE */
const net = require("net");
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    return {};
  }
}
const { performance } = require("perf_hooks");
global.THREE = require("three");
global.Worker = require("worker_threads").Worker;
const { createCanvas } = safeRequire("node-canvas-webgl/lib");

const fs = require("fs"); // add by yxhxianyu

const { WorldView, Viewer, getBufferFromStream } = require("../viewer");

module.exports = (
  bot,
  {
    viewDistance = 6,
    output = "output.mp4",
    interval = 16,
    width = 256,
    height = 144,
    jpegOptions,
  }
) => {
  const canvas = createCanvas(width, height);
  const renderer = new THREE.WebGLRenderer({ canvas });
  const viewer = new Viewer(renderer);

  viewer.setVersion(bot.version);
  viewer.setFirstPersonCamera(
    bot.entity.position,
    bot.entity.yaw,
    bot.entity.pitch
  );

  // Load world
  const worldView = new WorldView(bot.world, viewDistance, bot.entity.position);
  viewer.listen(worldView);
  worldView.init(bot.entity.position);

  function botPosition() {
    viewer.setFirstPersonCamera(
      bot.entity.position,
      bot.entity.yaw,
      bot.entity.pitch
    );
    worldView.updatePosition(bot.entity.position);
  }

  // Render loop streaming

  let idx = 0;
  let client = null;
  let ended = true; // Initially true - episode hasn't started
  let endRecording = false;
  const [host, port] = output.split(":");
  function connectClient() {
    client = new net.Socket();
    client.on("error", (err) => {
      console.error("[headless] Socket error:", err);
    });

    client.on("close", () => {
      console.log("[headless] Socket closed");
    });
    client.on("end", () => {
      console.log("[headless] Socket ended");
      console.log("[headless] Socket state at end:", {
        writable: client.writable,
        destroyed: client.destroyed,
        connecting: client.connecting,
        bytesWritten: client.bytesWritten,
        bytesRead: client.bytesRead,
      });
    });
    client.connect(parseInt(port, 10), host, () => {
      console.log("[headless] Connected to server");
      if (!ended && !endRecording) {
        update();
      }
    });
  }

  function writeAsync(socket, data, encoding) {
    return new Promise((resolve, reject) => {
      const canWrite = socket.write(data, (err) =>
        err ? reject(err) : resolve()
      );
      if (!canWrite) {
        socket.once("drain", resolve);
      }
    });
  }

  async function update() {
    try {
      if (ended || endRecording) {
        if (endRecording) {
          sendEndSignal();
        }
        return;
      }
      const pos = {
        x: bot.entity.position.x,
        y: bot.entity.position.y,
        z: bot.entity.position.z,
        yaw: bot.entity.yaw,
        pitch: bot.entity.pitch,
        action: {
          forward: bot.getControlState("forward"),
          back: bot.getControlState("back"),
          left: bot.getControlState("left"),
          right: bot.getControlState("right"),
          jump: bot.getControlState("jump"),
          sprint: bot.getControlState("sprint"),
          sneak: bot.getControlState("sneak"),
          camera: bot.getLastCameraAction(),
        },
        renderTime: performance.now(),
        physicsTime: bot.getLastPhysicsFrameTime(),
      };
      viewer.update();
      renderer.render(viewer.scene, viewer.camera);
      const imageStream = canvas.createJPEGStream({
        bufsize: 32768,
        quality: 1,
        progressive: false,
        ...jpegOptions,
      });

      const buffer = await getBufferFromStream(imageStream);
      const sizebuff = new Uint8Array(4);
      const view = new DataView(sizebuff.buffer, 0);
      view.setUint32(0, buffer.length, true);

      const posData = JSON.stringify(pos);
      const posSizeBuff = new Uint8Array(4);
      const posView = new DataView(posSizeBuff.buffer, 0);
      posView.setUint32(0, posData.length, true);

      await writeAsync(client, posSizeBuff);
      await writeAsync(client, posData);
      await writeAsync(client, sizebuff);
      await writeAsync(client, buffer);
    } catch (err) {
      console.error("[headless] Error in update:", err);
      console.error("[headless] Error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack,
      });
      console.error("[headless] Socket state at error:", {
        writable: client.writable,
        destroyed: client.destroyed,
        connecting: client.connecting,
        bytesWritten: client.bytesWritten,
        bytesRead: client.bytesRead,
      });
    }

    idx++;
    if (!ended && !endRecording) {
      setTimeout(update, interval);
    }
  }
  function sendEndSignal() {
    console.log("[headless] sending zero end of stream");
    const zero = new Uint8Array(4);
    const zeroView = new DataView(zero.buffer, 0);
    zeroView.setUint32(0, 0, true);
    client.write(zero);
    client.end();

    // Fire episodeended event when connection is actually closed
    client.once("close", () => {
      console.log("[headless] connection closed, firing episodeended event");
      ended = true;
      endRecording = false;
      bot.emit("episodeended");
    });
  }
  bot.on("startepisode", () => {
    if (ended) {
      // Only start if episode has ended
      console.log("[headless] starting episode - connecting to receiver");
      ended = false;
      endRecording = false;
      if (client && !client.destroyed) {
        console.log("[headless] reusing existing connection");
        update();
      } else {
        console.log("[headless] creating new connection");
        connectClient();
      }
    } else {
      console.log(
        "[headless] ignoring startepisode - episode already in progress"
      );
    }
  });

  bot.on("endepisode", () => {
    endRecording = true;
    console.log("[headless] ending episode");
  });

  // Register events
  bot.on("move", botPosition);
  worldView.listenToBot(bot);

  return;
};
