/* global THREE */
function safeRequire (path) {
  try {
    return require(path)
  } catch (e) {
    return {}
  }
}
global.THREE = require('three')
global.Worker = require('worker_threads').Worker
const { createCanvas } = safeRequire('node-canvas-webgl/lib')

const { WorldView, Viewer } = require('../viewer')
const { EventEmitter } = require('stream')

module.exports = (bot, { viewDistance = 6, width = 256, height = 144, jpegOptions }) => {
  const canvas = createCanvas(width, height)
  const renderer = new THREE.WebGLRenderer({ canvas })
  const viewer = new Viewer(renderer)

  viewer.setVersion(bot.version)
  viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)

  // Load world
  const worldView = new WorldView(bot.world, viewDistance, bot.entity.position)
  viewer.listen(worldView)
  worldView.init(bot.entity.position)
  worldView.listenToBot(bot)
  viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)

  let freecamera = new EventEmitter()
  freecamera.set = ({ pos, yaw, pitch }) => {
    viewer.setFirstPersonCamera(pos, yaw, pitch)
    worldView.updatePosition(bot.entity.position)
  }
  freecamera.get = () => {
    viewer.update()
    renderer.render(viewer.scene, viewer.camera)
    return canvas.toBuffer('image/jpeg', jpegOptions).toString('base64');
  }

  let idx = 0
  function update () {
    viewer.update()
    renderer.render(viewer.scene, viewer.camera)
    // idx++
    // if (idx <= 10) {
    //   setTimeout(update)
    // }
  }
  update()

  return freecamera
}
