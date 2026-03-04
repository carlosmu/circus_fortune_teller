import { engine, GltfContainer, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

export const TABLE = engine.addEntity()
export const WIZARD = engine.addEntity()

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

