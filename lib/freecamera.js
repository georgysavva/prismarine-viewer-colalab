const EventEmitter = require('events')
const { WorldView } = require('../viewer')

// freecameras is a dict
module.exports = (bot, freecameras, id, { viewDistance = 6, port = 3000, prefix = '' }) => {
  const express = require('express')

  const app = express()
  const http = require('http').createServer(app)

  const io = require('socket.io')(http, { path: prefix + '/socket.io' })

  const { setupRoutes } = require('./common')
  setupRoutes(app, prefix)

  const sockets = []
  const primitives = {}

  freecameras[id] = new EventEmitter()

  freecameras[id].erase = (id) => {
    delete primitives[id]
    for (const socket of sockets) {
      socket.emit('primitive', { id })
    }
  }

  freecameras[id].drawBoxGrid = (id, start, end, color = 'aqua') => {
    primitives[id] = { type: 'boxgrid', id, start, end, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  freecameras[id].drawLine = (id, points, color = 0xff0000) => {
    primitives[id] = { type: 'line', id, points, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  freecameras[id].drawPoints = (id, points, color = 0xff0000, size = 5) => {
    primitives[id] = { type: 'points', id, points, color, size }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

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

    freecameras[id].on('update', botPosition)
    worldView.listenToBot(bot)
    socket.on('disconnect', () => {
      freecameras[id].removeListener('update', botPosition)
      worldView.removeListenersFromBot(bot)
      sockets.splice(sockets.indexOf(socket), 1)
    })
  })

  http.listen(port, () => {
    console.log(`Prismarine viewer free camera [id = ${id}] running on *:${port}`)
  })

  freecameras[id].close = () => {
    http.close()
    for (const socket of sockets) {
      socket.disconnect()
    }
  }
}
