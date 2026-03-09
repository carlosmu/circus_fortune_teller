import { engine, GltfContainer, Transform, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

export const TABLE = engine.addEntity()
export const WIZARD = engine.addEntity()
/** Entidad con el GLB host_collider.glb: zona de clic para "Become Host" (el wizard ya no tiene collider). */
export const HOST_COLLIDER = engine.addEntity()

/** Posición del wizard en la escena (origen del GLB = 0,0,0, se coloca por código). */
const WIZARD_POSITION = Vector3.create(8, 0, 7.5)

/** Posición donde se teletransporta el jugador al convertirse en host (el mismo punto que el wizard). */
export const HOST_POSITION = WIZARD_POSITION
/** Punto al que mira la cámara del host (mesa/guest). */
export const HOST_CAMERA_TARGET = Vector3.create(8, 1, 8)

export function setupScene() {
  // TABLE ENTITY
  Transform.create(TABLE, {
    position: Vector3.create(8, 0, 8)
  })

  GltfContainer.create(TABLE, {
    src: 'assets/models/table.glb'
  })

  // WIZARD ENTITY (se oculta cuando el jugador local es host y ocupa su lugar)
  Transform.create(WIZARD, {
    position: WIZARD_POSITION
  })

  GltfContainer.create(WIZARD, {
    src: 'assets/models/wizard.glb'
  })
  VisibilityComponent.create(WIZARD, { visible: true })

  // HOST COLLIDER: mismo lugar que el wizard, para hacer clic en "Become Host"
  Transform.create(HOST_COLLIDER, {
    position: WIZARD_POSITION
  })

  GltfContainer.create(HOST_COLLIDER, {
    src: 'assets/models/host_collider.glb'
  })
}

