import {
  engine,
  Transform,
  TextShape,
  Billboard,
  MeshRenderer,
  Material,
  removeEntityWithChildren
} from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import type { Fortune } from './types'
import { WIZARD } from './scene'

const FORTUNE_3D_DURATION = 5 // segundos

// Tamaño del área de texto (igual que width/height del TextShape)
const TEXT_WIDTH = 4
const TEXT_HEIGHT = 2

let fortuneTextEntity: ReturnType<typeof engine.addEntity> | null = null
let fortuneTextRemaining = 0
let systemAdded = false

function capitalizeCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

/**
 * Muestra la fortuna en 3D sobre la cabeza del mago (mismo X,Z; Y + 3m),
 * con un recuadro negro de fondo. Desaparece a los 5 segundos.
 */
export function showFortune3DText(fortune: Fortune): void {
  if (fortuneTextEntity !== null) {
    removeEntityWithChildren(engine, fortuneTextEntity)
    fortuneTextEntity = null
  }

  const wizardTransform = Transform.getOrNull(WIZARD)
  if (!wizardTransform) return

  const pos = wizardTransform.position
  const x = pos.x
  const y = pos.y + 3
  const z = pos.z

  // Entidad padre: posición mundial y Billboard (fondo + texto giran con la cámara)
  const parent = engine.addEntity()
  Transform.create(parent, {
    position: Vector3.create(x, y, z)
  })
  Billboard.create(parent)

  // Fondo negro: plano en el centro del padre, escalado al tamaño del texto
  const background = engine.addEntity()
  Transform.create(background, {
    parent,
    position: Vector3.create(0, 0, 0),
    scale: Vector3.create(TEXT_WIDTH, TEXT_HEIGHT, 1)
  })
  MeshRenderer.setPlane(background)
  Material.setPbrMaterial(background, {
    albedoColor: Color4.Black()
  })

  // Texto delante del plano (Z local positivo = hacia la cámara) para que no quede tapado
  const textEntity = engine.addEntity()
  Transform.create(textEntity, {
    parent,
    position: Vector3.create(0, 0, -0.15)
  })
  const label = `${capitalizeCategory(fortune.category)}: ${fortune.text}`
  TextShape.create(textEntity, {
    text: label,
    fontSize: 2,
    textColor: Color4.White(),
    outlineColor: Color4.Black(),
    outlineWidth: 0.15,
    width: TEXT_WIDTH,
    height: TEXT_HEIGHT,
    textWrapping: true
  })

  fortuneTextEntity = parent
  fortuneTextRemaining = FORTUNE_3D_DURATION

  if (!systemAdded) {
    systemAdded = true
    engine.addSystem((dt: number) => {
      if (fortuneTextEntity === null) return
      fortuneTextRemaining -= dt
      if (fortuneTextRemaining <= 0) {
        removeEntityWithChildren(engine, fortuneTextEntity!)
        fortuneTextEntity = null
      }
    })
  }
}
