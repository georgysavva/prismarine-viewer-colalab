const EventEmitter = require('events')
const { WorldView } = require('../viewer')

// freecamera is a dict
module.exports = (bot, freecamera, { viewDistance = 4, port = 3000, prefix = '' }) => {
  const express = require('express')

  const app = express()
  const http = require('http').createServer(app)

  const io = require('socket.io')(http, { path: prefix + '/socket.io' })

  const { setupRoutes } = require('./common')
  setupRoutes(app, prefix)

  const sockets = []
  const primitives = {}

  freecamera = new EventEmitter()

  io.on('connection', (socket) => {
    socket.emit('version', bot.version)
    sockets.push(socket)

    const worldView = new WorldView(bot.world, viewDistance, bot.entity.position, socket)
    worldView.init(bot.entity.position)

    for (const id in primitives) {
      socket.emit('primitive', primitives[id])
    }

    function botPosition ({ pos, yaw, pitch }) {
      const packet = { pos, yaw, pitch, addMesh: true }
      socket.emit('position', packet)
      worldView.updatePosition(bot.entity.position)
    }

    freecamera.on('update', botPosition)
    worldView.listenToBot(bot)
    socket.on('disconnect', () => {
      freecamera.removeListener('update', botPosition)
      worldView.removeListenersFromBot(bot)
      sockets.splice(sockets.indexOf(socket), 1)
    })
  })

  http.listen(port, () => {
    console.log(`Prismarine viewer free camera [id = ${id}] running on *:${port}`)
  })

  freecamera.close = () => {
    http.close()
    for (const socket of sockets) {
      socket.disconnect()
    }
  }
}
