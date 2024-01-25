// Ensure 'node-canvas-webgl' is installed
function safeRequire (path) {
  try {
    return require(path)
  } catch (e) {
    return {}
  }
}
const { spawn } = require('child_process')
const net = require('net')
global.THREE = require('three')
global.Worker = require('worker_threads').Worker
const { createCanvas } = safeRequire('node-canvas-webgl/lib')

const fs = require('fs'); // add by yxhxianyu

const { WorldView, Viewer, getBufferFromStream } = require('../viewer')

const mineflayer = require('mineflayer')

// Import the module from headless.js in the lib directory
const freecamera = require('../lib/freecamera-base64')
const { Vec3 } = require('vec3')

// Setup a mineflayer bot
const bot = mineflayer.createBot({
    username: 'MineflayerBotT',
    host: 'localhost',
    port: 25565,
    version: '1.19',
})

let freecameras = {}

bot.once('spawn', () => {
    try {
        freecameras['1'] = freecamera(bot, { width: 256, height: 144 })
        freecameras['1'].set({ pos: new Vec3(-12, 110, 83), yaw: 3.14, pitch: 0})
    } catch (error) {
        console.error('Error during test:', error)
    }

    setInterval(() => {
        base64Image = freecameras['1'].get()
        if (base64Image === undefined) return
        saveBase64AsImage(base64Image, 'output' + '.jpg');
    }, 250)
})

function saveBase64AsImage(base64String, filename) {
    const base64Image = base64String.split(';base64,').pop();
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFile(filename, imageBuffer, {encoding: 'base64'}, function(err) {
        if (err) { console.error(err); } else { console.log('Successfully saved image.'); }
    });
}