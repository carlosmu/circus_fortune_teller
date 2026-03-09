import { engine, GltfContainer, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

export const TABLE = engine.addEntity()
export const WIZARD = engine.addEntity()

/** Posición donde se teletransporta el jugador al convertirse en host (detrás del mago). */
export const HOST_POSITION = Vector3.create(8, 0, 6.5)
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

  // WIZARD ENTITY
  Transform.create(WIZARD, {
    position: Vector3.create(8, 0, 7.5)
  })

  GltfContainer.create(WIZARD, {
    src: 'assets/models/wizard.glb'
  })
}

