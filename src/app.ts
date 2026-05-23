import type { RigidBody, World } from '@dimforge/rapier3d-compat'
import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { DIE_SIZE, Die } from './die'
import { createDieTextures } from './textures'

const WALL_HALF_H = 4

// Top-down orthographic: frustum maps 1:1 to world units on the XZ plane.
function minFrustumHeight(worldHalf: number, aspect: number): number {
  return Math.max(worldHalf * 2, (worldHalf * 2) / aspect) * 1.1
}

export class App {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.OrthographicCamera
  private readonly world: World
  private readonly dice: Die[] = []
  private wallBodies: RigidBody[] = []
  private lastTime = 0
  private physicsAccum = 0
  private readonly physicsStep = 1 / 60
  private rafId = 0

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    document.body.prepend(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x182218)

    // True top-down orthographic camera; frustum is set in resize()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
    this.camera.up.set(0, 0, -1)
    this.camera.position.set(0, 20, 0)
    this.camera.lookAt(0, 0, 0)

    this.setupLighting()
    this.world = new RAPIER.World({ x: 0, y: -25, z: 0 })
    this.setupFloor()

    const textures = createDieTextures()
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z → assign 3,4,1,6,2,5
    // (opposite faces sum to 7)
    const faceOrder = [2, 4, 0, 5, 1, 3] // indices into textures[] for faces 3,4,1,6,2,5
    const sharedMats = faceOrder.map((i) => new THREE.MeshLambertMaterial({ map: textures[i] }))

    const s = 2.6
    const positions = [
      { x: -s, z: -s * 0.4 },
      { x: s, z: -s * 0.4 },
      { x: 0, z: s * 0.55 },
      { x: -s * 0.55, z: s },
      { x: s * 0.55, z: s },
    ]
    for (const pos of positions) {
      this.dice.push(new Die(this.scene, this.world, pos, sharedMats))
    }

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  private setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7))

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.8)
    sun.position.set(8, 14, 6)
    sun.castShadow = true
    sun.shadow.camera.left = -32
    sun.shadow.camera.right = 32
    sun.shadow.camera.top = 32
    sun.shadow.camera.bottom = -32
    sun.shadow.mapSize.width = 2048
    sun.shadow.mapSize.height = 2048
    this.scene.add(sun)
  }

  private setupFloor() {
    const floorY = -DIE_SIZE / 2
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x1a3028 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = floorY
    floor.receiveShadow = true
    this.scene.add(floor)

    // Physics floor: top surface aligned with visual floor at floorY
    const floorHalfH = 0.5
    const floorBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorY - floorHalfH, 0))
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(60, floorHalfH, 60).setRestitution(0.2).setFriction(0.6),
      floorBody,
    )
  }

  private resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const aspect = w / h

    this.renderer.setSize(w, h)

    const fh = minFrustumHeight(8, aspect)
    const fw = fh * aspect
    this.camera.left = -fw / 2
    this.camera.right = fw / 2
    this.camera.top = fh / 2
    this.camera.bottom = -fh / 2
    this.camera.updateProjectionMatrix()

    // Project viewport corners onto Y=0 to find exact visible XZ bounds
    const raycaster = new THREE.Raycaster()
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const corners = [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(-1, 1),
    ]
    const pts: THREE.Vector3[] = []
    for (const ndc of corners) {
      raycaster.setFromCamera(ndc, this.camera)
      const p = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(floorPlane, p)) pts.push(p)
    }
    if (pts.length === 4) {
      this.rebuildWalls(
        Math.min(...pts.map((p) => p.x)),
        Math.max(...pts.map((p) => p.x)),
        Math.min(...pts.map((p) => p.z)),
        Math.max(...pts.map((p) => p.z)),
      )
    }
  }

  private rebuildWalls(minX: number, maxX: number, minZ: number, maxZ: number) {
    for (const body of this.wallBodies) this.world.removeRigidBody(body)
    this.wallBodies = []

    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2
    const hw = (maxX - minX) / 2
    const hd = (maxZ - minZ) / 2
    const t = 1.5 // wall half-thickness

    const defs = [
      { x: minX - t, z: cz, hx: t, hz: hd + t },
      { x: maxX + t, z: cz, hx: t, hz: hd + t },
      { x: cx, z: minZ - t, hx: hw + t, hz: t },
      { x: cx, z: maxZ + t, hx: hw + t, hz: t },
    ]

    for (const d of defs) {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(d.x, 0, d.z))
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(d.hx, WALL_HALF_H, d.hz).setRestitution(0.7).setFriction(0.1),
        body,
      )
      this.wallBodies.push(body)
    }
  }

  roll(minForce: number, maxForce: number) {
    for (const die of this.dice) {
      const angle = Math.random() * Math.PI * 2
      const mag = minForce + Math.random() * (maxForce - minForce)
      die.roll(Math.cos(angle) * mag, Math.sin(angle) * mag)
    }
  }

  start() {
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop() {
    cancelAnimationFrame(this.rafId)
  }

  private readonly loop = (now: number) => {
    this.rafId = requestAnimationFrame(this.loop)

    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now

    this.physicsAccum += dt
    let steps = 0
    while (this.physicsAccum >= this.physicsStep && steps < 4) {
      this.world.step()
      this.physicsAccum -= this.physicsStep
      steps++
    }

    for (const die of this.dice) die.sync()
    this.renderer.render(this.scene, this.camera)
  }
}
