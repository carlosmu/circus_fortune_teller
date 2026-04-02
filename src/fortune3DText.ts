import {
  engine,
  Transform,
  TextShape,
  Billboard,
  MeshRenderer,
  Material,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import type { Fortune, FortuneKind } from './types'

const KIND_LINE: Record<FortuneKind, string> = {
  advertencia: 'Warning',
  consejo: 'Advice',
  prediccion: 'Prediction'
}
import { WIZARD } from './scene'
import { gameData } from './gameState'
import { FORTUNE_DISPLAY_DURATION, SHOW_3D_FORTUNE } from './sceneConfig'

const TEXT_WIDTH = 4
const TEXT_HEIGHT = 2

let parentEntity: ReturnType<typeof engine.addEntity> | null = null
let textEntity: ReturnType<typeof engine.addEntity> | null = null
let fortuneTextRemaining = 0
let systemAdded = false

function capitalizeCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function ensureEntities(): { parent: ReturnType<typeof engine.addEntity>; text: ReturnType<typeof engine.addEntity> } | null {
  if (parentEntity !== null && textEntity !== null) return { parent: parentEntity, text: textEntity }

  const wizardTransform = Transform.getOrNull(WIZARD)
  if (!wizardTransform) return null

  const pos = wizardTransform.position
  const parent = engine.addEntity()
  Transform.create(parent, {
    position: Vector3.create(pos.x, pos.y + 3, pos.z)
  })
  Billboard.create(parent)

  const background = engine.addEntity()
  Transform.create(background, {
    parent,
    position: Vector3.create(0, 0, 0),
    scale: Vector3.create(TEXT_WIDTH, TEXT_HEIGHT, 1)
  })
  MeshRenderer.setPlane(background)
  Material.setPbrMaterial(background, { albedoColor: Color4.Black() })

  const text = engine.addEntity()
  Transform.create(text, {
    parent,
    position: Vector3.create(0, 0, -0.15)
  })
  TextShape.create(text, {
    text: '',
    fontSize: 2,
    textColor: Color4.White(),
    outlineColor: Color4.Black(),
    outlineWidth: 0.15,
    width: TEXT_WIDTH,
    height: TEXT_HEIGHT,
    textWrapping: true
  })

  parentEntity = parent
  textEntity = text
  return { parent, text }
}

/**
 * Muestra la fortuna en 3D sobre la cabeza del mago. Reutiliza entidades (solo actualiza posición y texto)
 * para evitar crear/destruir en cada revelación y reducir el error "Message too large".
 */
export function showFortune3DText(fortune: Fortune): void {
  if (!SHOW_3D_FORTUNE) return

  const wizardTransform = Transform.getOrNull(WIZARD)
  if (!wizardTransform) return

  const entities = ensureEntities()
  if (!entities) return

  const pos = wizardTransform.position
  Transform.getMutable(entities.parent).position = Vector3.create(pos.x, pos.y + 3, pos.z)

  const guestName = gameData.currentGuestName ?? ''
  const categoryLabel = capitalizeCategory(fortune.category)
  const kindLine = KIND_LINE[fortune.type]
  const label = guestName
    ? `${guestName}: \n${categoryLabel} · ${kindLine}: \n${fortune.text}`
    : `${categoryLabel} · ${kindLine}: \n${fortune.text}`
  TextShape.getMutable(entities.text).text = label

  VisibilityComponent.createOrReplace(entities.parent, { visible: true })
  fortuneTextRemaining = FORTUNE_DISPLAY_DURATION

  if (!systemAdded) {
    systemAdded = true
    engine.addSystem((dt: number) => {
      if (fortuneTextRemaining <= 0) return
      fortuneTextRemaining -= dt
      if (fortuneTextRemaining <= 0 && parentEntity !== null) {
        VisibilityComponent.createOrReplace(parentEntity, { visible: false })
      }
    })
  }
}
