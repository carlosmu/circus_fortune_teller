import { engine, GltfContainer, Transform, VisibilityComponent, LightSource } from '@dcl/sdk/ecs'
import { Vector3, Color3, Quaternion } from '@dcl/sdk/math'

export const TABLE = engine.addEntity()
export const FLOOR = engine.addEntity()
export const TENT = engine.addEntity()
export const LIGHTS_TENT = engine.addEntity()
export const WIZARD = engine.addEntity()
/** Entity with host_collider.glb: click area for "Become Host" (wizard has no collider). */
export const HOST_COLLIDER = engine.addEntity()

/** Spotlight dinámico (ilumina la escena con sombras). Duplica el patrón para más luces. */
export const SPOTLIGHT_MAIN = engine.addEntity()

/** Wizard position in scene (GLB origin 0,0,0, placed by code). */
const WIZARD_POSITION = Vector3.create(8, 0, 5.5)

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
    position: WIZARD_POSITION,
    scale: Vector3.create(1.2, 1.2, 1.2)
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
  // GltfContainer.create(TENT, {
  //   src: 'assets/models/tent.glb'
  // })
  Transform.create(LIGHTS_TENT, {
    position: Vector3.create(8, 0, 8)
  })
  GltfContainer.create(LIGHTS_TENT, {
    src: 'assets/models/lights_tent.glb'
  })

  // Spotlight: posición (8, 4, 8), cono apuntando hacia abajo (hacia mesa/suelo)
  Transform.create(SPOTLIGHT_MAIN, {
    position: Vector3.create(8, 1, 6),
    rotation: Quaternion.fromEulerDegrees(-115, 0, 0)
  })
  LightSource.create(SPOTLIGHT_MAIN, {
    type: LightSource.Type.Spot({ innerAngle: 28, outerAngle: 50 }),
    color: Color3.create(1, 0.95, 0.85),
    intensity: 2000,
    range: 20,
    active: true,
    shadow: true
  })
}

