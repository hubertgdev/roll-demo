import type { RigidBody, World } from '@dimforge/rapier3d-compat'
import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

export const DIE_SIZE = 1.4

export class Die {
  readonly mesh: THREE.Mesh
  private readonly body: RigidBody

  constructor(scene: THREE.Scene, world: World, position: { x: number; z: number }, materials: THREE.Material[]) {
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE), materials)
    this.mesh.castShadow = true
    scene.add(this.mesh)

    const h = DIE_SIZE / 2
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, 0, position.z)
        .setLinearDamping(0.3)
        .setAngularDamping(0.8),
    )
    world.createCollider(RAPIER.ColliderDesc.cuboid(h, h, h).setRestitution(0.35).setFriction(0.4), this.body)
  }

  roll(impulseX: number, impulseZ: number) {
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    const upImpulse = 10 + Math.random() * 10
    this.body.applyImpulse({ x: impulseX, y: upImpulse, z: impulseZ }, true)
    const t = 18
    this.body.applyTorqueImpulse(
      { x: (Math.random() - 0.5) * t, y: (Math.random() - 0.5) * t, z: (Math.random() - 0.5) * t },
      true,
    )
  }

  sync() {
    const pos = this.body.translation()
    const rot = this.body.rotation()
    this.mesh.position.set(pos.x, pos.y, pos.z)
    this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
  }
}
