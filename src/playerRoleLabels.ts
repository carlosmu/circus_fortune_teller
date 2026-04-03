import { engine, Transform, TextShape, Billboard, MeshRenderer, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'

const LABEL_Y = 2.0
/** Offset local del avatar (girado con la rotación del jugador): un poco hacia atrás sentado. */
const LABEL_Z = -0.4
const FONT_SIZE = 1.22
/** Caja del TextShape y escala del plano (metros). */
const LABEL_W = 0.8
const LABEL_H = 0.12
const BG_PAD_X = 0.12
const BG_PAD_Y = 0.06

const COLOR_FT = Color4.create(1, 1, 1, 1)
const COLOR_GUEST = Color4.create(1, 1, 1, 1)

type Slot = {
  userId: string | null
  entity: ReturnType<typeof engine.addEntity> | null
}

const ftSlot: Slot = { userId: null, entity: null }
const guestSlot: Slot = { userId: null, entity: null }

/**
 * Resolver jugador en escena aunque el wallet venga con distinto casing (MessageBus vs identidad).
 */
function getScenePlayer(userId: string) {
  const p = getPlayer({ userId })
  if (p !== null) return p
  const lower = userId.toLowerCase()
  if (lower !== userId) {
    const q = getPlayer({ userId: lower })
    if (q !== null) return q
  }
  return null
}

/** Posición mundo del cartel: pie del avatar + offset local rotado (sin parentear al avatar). */
function labelWorldPositionFromAvatar(avatarEntity: ReturnType<typeof engine.addEntity>): Vector3 {
  const atr = Transform.getOrNull(avatarEntity)
  if (atr === null) return Vector3.Zero()
  const local = Vector3.create(0, LABEL_Y, LABEL_Z)
  const rotated = Vector3.rotate(local, atr.rotation)
  return Vector3.add(atr.position, rotated)
}

/**
 * Etiqueta en espacio mundo (no hija del avatar): cada cliente la crea y la mueve igual → la ven todos;
 * no toca la jerarquía del avatar → menos riesgo de romper el nametag del cliente.
 */
function createRoleLabel(line: string, textColor: typeof COLOR_FT): ReturnType<typeof engine.addEntity> {
  const root = engine.addEntity()
  Transform.create(root, {
    position: Vector3.Zero()
  })
  Billboard.create(root)

  const bg = engine.addEntity()
  Transform.create(bg, {
    parent: root,
    position: Vector3.create(0, 0, 0),
    scale: Vector3.create(LABEL_W + BG_PAD_X, LABEL_H + BG_PAD_Y, 1)
  })
  MeshRenderer.setPlane(bg)
  Material.setPbrMaterial(bg, { albedoColor: Color4.Black() })

  const textEnt = engine.addEntity()
  Transform.create(textEnt, {
    parent: root,
    position: Vector3.create(0, 0, -0.12)
  })
  TextShape.create(textEnt, {
    text: line,
    fontSize: FONT_SIZE,
    textColor,
    outlineColor: Color4.Black(),
    outlineWidth: 0.1,
    width: LABEL_W,
    height: LABEL_H
  })

  return root
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

  const p = getScenePlayer(desiredUserId)
  if (p === null) {
    if (slot.entity !== null) {
      engine.removeEntity(slot.entity)
      slot.entity = null
    }
    return
  }

  if (slot.entity === null) {
    slot.entity = createRoleLabel(line, textColor)
  }

  const rootTr = Transform.getMutable(slot.entity)
  rootTr.position = labelWorldPositionFromAvatar(p.entity)
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
