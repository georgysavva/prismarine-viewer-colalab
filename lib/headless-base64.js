/* global THREE */
const net = require("net");
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    return {};
  }
}
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
  let ended = false;
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
      update();
    });
  }
  connectClient();

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
      if (ended) {
        sendEndSignal();
        return;
      }
      viewer.update();
      renderer.render(viewer.scene, viewer.camera);
      const pos = {};
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
    setTimeout(update, interval);
  }
  function sendEndSignal() {
    console.log("[headless] sending zero end of stream");
    const zero = new Uint8Array(4);
    const zeroView = new DataView(zero.buffer, 0);
    zeroView.setUint32(0, 0, true);
    client.write(zero);
    client.end();
  }
  bot.on("endtask", () => {
    ended = true;
    console.log("[headless] receive end");
  });

  // Register events
  bot.on("move", botPosition);
  worldView.listenToBot(bot);

  return;
};
