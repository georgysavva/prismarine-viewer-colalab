/* global THREE */
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
const { performance } = require("perf_hooks");
const net = require("net");

const fs = require("fs"); // add by yxhxianyu

const { WorldView, Viewer, getBufferFromStream } = require("../viewer");

module.exports = (
  bot,
  views,
  {
    viewDistance = 6,
    output = "output.mp4",
    interval = 250,
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

  // Render loop streaming

  let client = new net.Socket();
  let idx = 0;
  let queue = [];
  let ended = false;
  let running = false;
  let sentendsignal = false;
  let lastSendTime = 0;
  const MIN_SEND_INTERVAL = 3; // Minimum interval between sends in milliseconds
  viewer.update();
  renderer.render(viewer.scene, viewer.camera);
  let updateInterval = null;
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
      updateInterval = setInterval(update, 16);
    });
  }
  function enqueue(pos) {
    if (ended) {
      return;
    }
    queue.push(pos);
    // console.log('[headless] enqueue', queue.length)
    processQueue();
  }
  function sendEndSignal() {
    console.log("[headless] sending zero end of stream");
    sentendsignal = true;
    zero = new Uint8Array(4);
    zeroview = new DataView(zero.buffer, 0);
    zeroview.setUint32(0, 0, true);
    client.write(zero);
    client.end();
  }
  async function processQueue() {
    if (running || sentendsignal) return;
    running = true;
    // console.log('[headless] processQueue', queue.length)
    while (queue.length > 0) {
      const pos = queue.shift();
      const now = Date.now();
      if (now - lastSendTime < MIN_SEND_INTERVAL) {
        // If we're sending too fast, wait a bit
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_SEND_INTERVAL - (now - lastSendTime))
        );
      }
      await updbotPosition(pos);
      lastSendTime = Date.now();
    }

    if (ended) {
      sendEndSignal();
    }
    running = false;
  }
  async function updbotPosition(pos) {
    viewer.setFirstPersonCamera(pos, pos.yaw, pos.pitch);
    worldView.updatePosition(pos);
    // await update(pos);
  }
  function writeAsync(socket, data, encoding) {
    return new Promise((resolve, reject) => {
      const canWrite = socket.write(data, (err) =>
        err ? reject(err) : resolve()
      );
      // 如果不能立即写入，等待 drain 事件
      if (!canWrite) {
        socket.once("drain", resolve);
      }
    });
  }
  // async function update(pos) {
  //   try {
  //     viewer.update();
  //     renderer.render(viewer.scene, viewer.camera);
  //     const imageBuffer = canvas.toBuffer("image/jpeg", jpegOptions);
  //     views[bot.username] = imageBuffer.toString("base64");
  //     if (pos === null) {
  //       return;
  //     }

  //     const imageStream = canvas.createJPEGStream({
  //       bufsize: 32768,
  //       quality: 1,
  //       progressive: false,
  //       ...jpegOptions,
  //     });

  //     buffer = await getBufferFromStream(imageStream);
  //     pos.renderTick = bot.time.age;
  //     pos.renderPTime = performance.now();
  //     const sizebuff = new Uint8Array(4);
  //     const view = new DataView(sizebuff.buffer, 0);
  //     view.setUint32(0, buffer.length, true);

  //     const posData = JSON.stringify(pos);
  //     const posSizeBuff = new Uint8Array(4);
  //     const posView = new DataView(posSizeBuff.buffer, 0);
  //     posView.setUint32(0, posData.length, true);

  //     await writeAsync(client, posSizeBuff);
  //     await writeAsync(client, posData);
  //     await writeAsync(client, sizebuff);
  //     await writeAsync(client, buffer);
  //   } catch (err) {
  //     console.error("[headless] Error in update:", err);
  //     console.error("[headless] Error details:", {
  //       code: err.code,
  //       message: err.message,
  //       stack: err.stack,
  //     });
  //     // 添加更多错误上下文
  //     console.error("[headless] Socket state at error:", {
  //       writable: client.writable,
  //       destroyed: client.destroyed,
  //       connecting: client.connecting,
  //       bytesWritten: client.bytesWritten,
  //       bytesRead: client.bytesRead,
  //     });
  //   }
  // }

  const [host, port] = output.split(":");
  connectClient();
  // Force end of stream
  bot.on("endtask", () => {
    ended = true;
    console.log("[headless] receive end");
  });
  bot.on("physicsTick", () => {
    if (sentendsignal === false && running === false) {
      processQueue();
    }
  });
  bot.on("abnormal_exit", () => {
    console.log("[headless] abnormal exit");
    sendEndSignal();
    process.exit(1);
  });
  // Register events
  bot.on("sentPosAction", enqueue);
  // Register events
  worldView.listenToBot(bot);
  bot._client.on("error", (err) => {
    console.error("[bot._client error]", err.code, err.message);
  });

  function update() {
    if (ended) {
      clearInterval(updateInterval);
      return;
    }
    const t0 = performance.now();

    viewer.update();

    renderer.render(viewer.scene, viewer.camera);
    const t1 = performance.now();

    const imageStream = canvas.createJPEGStream({
      bufsize: 4096,
      quality: 1,
      progressive: false,
      ...jpegOptions,
    });

    getBufferFromStream(imageStream)
      .then((buffer) => {
        let pos = {
          x: 133.681,
          y: 72,
          z: -106.492,
          yaw: 3.027,
          pitch: 0,
          action: {
            forward: false,
            back: false,
            left: false,
            right: false,
            jump: false,
            sprint: false,
            sneak: false,
            camera: [0, 0],
          },
          frame_count: 0,
          extra_info: { seed: 42 },
        };
        pos.renderTick = bot.time.age;
        pos.renderPTime = performance.now();
        pos.renderPTime0 = t0;
        pos.renderPTime1 = t1;
        const posData = JSON.stringify(pos);
        const posSizeBuff = new Uint8Array(4);
        const posView = new DataView(posSizeBuff.buffer, 0);
        posView.setUint32(0, posData.length, true);

        const sizebuff = new Uint8Array(4);
        const view = new DataView(sizebuff.buffer, 0);
        view.setUint32(0, buffer.length, true);
        client.write(posSizeBuff);
        client.write(posData);
        client.write(sizebuff);
        client.write(buffer);

        idx++;
      })
      .catch(() => {});
  }
  return;
};
