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
const headlessViewer = require('../lib/headless-base64')

// Setup a mineflayer bot
const bot = mineflayer.createBot({
    username: 'MineflayerBotT',
    host: 'localhost',
    port: 25565,
    version: '1.19',
})

let views = {}

bot.once('spawn', () => {
    try {
        // Call the function from your headless.js module
        headlessViewer(bot, views, { width: 256, height: 144 })
        bot.setControlState('jump', true)
        // Here you can add additional assertions or checks as needed
    } catch (error) {
        console.error('Error during test:', error)
    }
})

function saveBase64AsImage(base64String, filename) {
    const base64Image = base64String.split(';base64,').pop();
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFile(filename, imageBuffer, {encoding: 'base64'}, function(err) {
        if (err) { console.error(err); } else { console.log('Successfully saved image.'); }
    });
}

let idx = 0
setInterval(() => {
    base64Image = views[bot.username]
    if (base64Image === undefined) return
    saveBase64AsImage(base64Image, 'output' + idx + '.jpg');
    idx += 1
}, 250)

// Additional tests or cleanup can go here