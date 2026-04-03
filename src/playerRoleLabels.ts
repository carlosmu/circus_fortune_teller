import { engine, Transform, TextShape, Billboard } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'

const LABEL_Y = 2.0
/** Local al avatar: hacia atrás cuando está sentado (silla empuja el torso hacia +Z). */
const LABEL_Z = -0.4
const FONT_SIZE = 1.35
const LABEL_W = 3.2
const LABEL_H = 0.55

const COLOR_FT = Color4.create(1, 1, 1, 1)
const COLOR_GUEST = Color4.create(1, 1, 1, 1)

type Slot = {
  userId: string | null
  entity: ReturnType<typeof engine.addEntity> | null
}

const ftSlot: Slot = { userId: null, entity: null }
const guestSlot: Slot = { userId: null, entity: null }

function createRoleLabel(
  avatarEntity: ReturnType<typeof engine.addEntity>,
  line: string,
  textColor: typeof COLOR_FT
): ReturnType<typeof engine.addEntity> {
  const e = engine.addEntity()
  Transform.create(e, {
    parent: avatarEntity,
    position: Vector3.create(0, LABEL_Y, LABEL_Z)
  })
  Billboard.create(e)
  TextShape.create(e, {
    text: line,
    fontSize: FONT_SIZE,
    textColor,
    outlineColor: Color4.Black(),
    outlineWidth: 0.12,
    width: LABEL_W,
    height: LABEL_H
  })
  return e
}

function syncSlot(
  slot: Slot,
  desiredUserId: string | null,
  line: string,
  textColor: typeof COLOR_FT
): void {
  if (desiredUserId !== slot.userId) {
    if (slot.entity !== null) {
      engine.removeEntity(slot.entity)
      slot.entity = null
    }
    slot.userId = desiredUserId
  }

  if (desiredUserId === null) return

  const p = getPlayer({ userId: desiredUserId })
  if (p === null) {
    if (slot.entity !== null) {
      engine.removeEntity(slot.entity)
      slot.entity = null
    }
    return
  }

  const avatarEnt = p.entity

  if (slot.entity === null) {
    slot.entity = createRoleLabel(avatarEnt, line, textColor)
    return
  }

  const tr = Transform.getOrNull(slot.entity)
  if (tr === null || tr.parent !== avatarEnt) {
    engine.removeEntity(slot.entity)
    slot.entity = createRoleLabel(avatarEnt, line, textColor)
  }
}

/**
 * Etiquetas 3D sobre los avatares: "Fortune Teller" y "Guest" según roles sincronizados.
 */
export function setupPlayerRoleLabels(): void {
  engine.addSystem(() => {
    const ftId = gameData.currentFortuneTellerId
    let guestId = gameData.guestSeatUserId
    if (guestId !== null && guestId === ftId) {
      guestId = null
    }

    syncSlot(ftSlot, ftId, 'Fortune Teller', COLOR_FT)
    syncSlot(guestSlot, guestId, 'Guest', COLOR_GUEST)
  })
}
