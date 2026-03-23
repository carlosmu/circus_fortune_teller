import { engine, GltfContainer, Transform, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

export const TABLE = engine.addEntity()
export const FLOOR = engine.addEntity()
export const TENT = engine.addEntity()
export const WIZARD = engine.addEntity()
/** Entity with host_collider.glb: click area for "Become Host" (wizard has no collider). */
export const HOST_COLLIDER = engine.addEntity()

/** Wizard position in scene (GLB origin 0,0,0, placed by code). */
const WIZARD_POSITION = Vector3.create(8, 0, 7.5)

/** Position the player is teleported to when becoming host (same as wizard). */
export const HOST_POSITION = WIZARD_POSITION
/** Point the host camera looks at (table/guest). */
export const HOST_CAMERA_TARGET = Vector3.create(8, 1, 8)

export function setupScene() {
  // TABLE ENTITY
  Transform.create(TABLE, {
    position: Vector3.create(8, 0, 8)
  })

  GltfContainer.create(TABLE, {
    src: 'assets/models/table.glb'
  })

  // WIZARD (hidden when local player is host)
  Transform.create(WIZARD, {
    position: WIZARD_POSITION
  })

  GltfContainer.create(WIZARD, {
    src: 'assets/models/wizard.glb'
  })
  VisibilityComponent.create(WIZARD, { visible: true })

  // HOST COLLIDER: same position as wizard, for "Become Host" click
  Transform.create(HOST_COLLIDER, {
    position: WIZARD_POSITION
  })

  
  GltfContainer.create(HOST_COLLIDER, {
    src: 'assets/models/host_collider.glb'
  })
  Transform.create(FLOOR, {
    position: Vector3.create(8, 0, 8)
  })
  GltfContainer.create(FLOOR, {
    src: 'assets/models/floor.glb'
  })
  Transform.create(TENT, {
    position: Vector3.create(8, 0, 8)
  })
  GltfContainer.create(TENT, {
    src: 'assets/models/tent.glb'
  })
}

