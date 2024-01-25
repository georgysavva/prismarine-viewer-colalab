
const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')
const { WorldRenderer } = require('./worldrenderer')
const { Entities } = require('./entities')
const { Primitives } = require('./primitives')
const { getVersion } = require('./version')
const { Vec3 } = require('vec3')
const assert = require('assert')

class Viewer {
  constructor (renderer) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('lightblue')

    this.ambientLight = new THREE.AmbientLight(0xcccccc)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)

    const size = renderer.getSize(new THREE.Vector2())
    this.camera = new THREE.PerspectiveCamera(75, size.x / size.y, 0.1, 1000)

    this.world = new WorldRenderer(this.scene)
    this.entities = new Entities(this.scene)
    this.primitives = new Primitives(this.scene, this.camera)

    this.domElement = renderer.domElement
  }

  setVersion (version) {
    version = getVersion(version)
    // console.log('Using version: ' + version)
    this.version = version
    this.world.setVersion(version)
    this.entities.clear()
    this.primitives.clear()
  }

  addColumn (x, z, chunk) {
    this.world.addColumn(x, z, chunk)
  }

  removeColumn (x, z) {
    this.world.removeColumn(x, z)
  }

  setBlockStateId (pos, stateId) {
    this.world.setBlockStateId(pos, stateId)
  }

  updateEntity (e) {
    this.entities.update(e)
  }

  updatePrimitive (p) {
    this.primitives.update(p)
  }

  setFirstPersonCamera (pos, yaw, pitch) {
    if (pos) new TWEEN.Tween(this.camera.position).to({ x: pos.x, y: pos.y + 1.6, z: pos.z }, 50).start()
    this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  }

  /**
   * This function will set scene.background, ambientLight, directionalLight, according to time of the day
   * 
   * @param {*} tick Time of the day, in ticks. 
   * Time is based on ticks, where 20 ticks happen every second. There are 24000 ticks in a day, making Minecraft days exactly 20 minutes long.
   * The time of day is based on the timestamp modulo 24000. 0 is sunrise, 6000 is noon, 12000 is sunset, and 18000 is midnight.
   */
  setTimeOfDay (tick) {
    // console.log("timeOfDay: ", tick)

    /*
    0~12000 => day
    12000~14000 => dusk
    14000~22000 => night
    22000~24000 => dawn
    */

    let time = 1;

    if (tick <= 11500) {
      time = 1;
    } else if(tick <= 14000) {
      time = 1 - (tick - 11500) / 2500;
    } else if(tick <= 21500) {
      time = 0
    } else if(tick <= 24000) {
      time = (tick - 21500) / 2500;
    } else assert(false, "timeOfDay is exceed 24000")

    const bg_r = Math.floor(173 * time)
    const bg_g = Math.floor(216 * time)
    const bg_b = Math.floor(230 * time)
    const ambient = Math.floor(104 * time + 104)
    const light = Math.floor(128 * time + 127)

    this.scene.background = new THREE.Color(`rgb(${bg_r}, ${bg_g}, ${bg_b})`)

    this.scene.remove(this.ambientLight)
    this.ambientLight = new THREE.AmbientLight(`rgb(${ambient}, ${ambient}, ${ambient})`)
    this.scene.add(this.ambientLight)

    this.scene.remove(this.directionalLight)
    this.directionalLight = new THREE.DirectionalLight(`rgb(${light}, ${light}, ${light})`, 0.5)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)
  }

  listen (emitter) {
    emitter.on('entity', (e) => {
      this.updateEntity(e)
    })

    emitter.on('primitive', (p) => {
      this.updatePrimitive(p)
    })

    emitter.on('loadChunk', ({ x, z, chunk }) => {
      this.addColumn(x, z, chunk)
    })

    emitter.on('unloadChunk', ({ x, z }) => {
      this.removeColumn(x, z)
    })

    emitter.on('blockUpdate', ({ pos, stateId }) => {
      this.setBlockStateId(new Vec3(pos.x, pos.y, pos.z), stateId)
    })

    emitter.on('timeOfDay', ({ tick }) => {
      this.setTimeOfDay(tick)
    })

    this.domElement.addEventListener('pointerdown', (evt) => {
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
      mouse.x = (evt.clientX / this.domElement.clientWidth) * 2 - 1
      mouse.y = -(evt.clientY / this.domElement.clientHeight) * 2 + 1
      raycaster.setFromCamera(mouse, this.camera)
      const ray = raycaster.ray
      emitter.emit('mouseClick', { origin: ray.origin, direction: ray.direction, button: evt.button })
    })
  }

  update () {
    TWEEN.update()
  }

  async waitForChunksToRender () {
    await this.world.waitForChunksToRender()
  }
}

module.exports = { Viewer }
