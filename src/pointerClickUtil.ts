import { engine, pointerEventsSystem, PointerEvents, InputAction } from '@dcl/sdk/ecs'

/** `InteractionType.PROXIMITY` — prompt por proximidad / tecla E del composite. */
const INTERACTION_PROXIMITY = 1

export type PointerClickOpts = {
  hoverText: string
  maxDistance: number
  showFeedback?: boolean
  showHighlight?: boolean
}

/** Quita entradas del composite (E/F, proximidad, “Sit Here”, duplicados de click). */
export function stripBuiltInPointerUi(entity: ReturnType<typeof engine.addEntity>): void {
  if (!PointerEvents.has(entity)) return
  const m = PointerEvents.getMutable(entity)
  const kept: typeof m.pointerEvents = []
  const seenPointer = new Set<string>()

  for (const e of m.pointerEvents) {
    if ((e.interactionType ?? 0) === INTERACTION_PROXIMITY) continue
    const info = e.eventInfo
    if (!info) {
      kept.push(e)
      continue
    }
    const btn = info.button
    if (btn === InputAction.IA_PRIMARY || btn === InputAction.IA_SECONDARY) continue
    const ht = info.hoverText?.trim() ?? ''
    if (ht === 'Sit Here') continue
    if (btn === InputAction.IA_POINTER) {
      const key = `${e.eventType}|${ht}`
      if (seenPointer.has(key)) continue
      seenPointer.add(key)
    }
    kept.push(e)
  }
  m.pointerEvents = kept
}

/** Un solo hint de clic (IA_POINTER); sin E ni entradas del Creator en la entity. */
export function registerPointerClickOnly(
  entity: ReturnType<typeof engine.addEntity>,
  opts: PointerClickOpts,
  onClick: () => void
): void {
  pointerEventsSystem.removeOnPointerDown(entity)
  if (PointerEvents.has(entity)) {
    PointerEvents.getMutable(entity).pointerEvents = []
  }
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: opts.hoverText,
        maxDistance: opts.maxDistance,
        showFeedback: opts.showFeedback ?? true,
        showHighlight: opts.showHighlight ?? true
      }
    },
    onClick
  )
  stripBuiltInPointerUi(entity)
}

export function setPointerMaxDistance(entity: ReturnType<typeof engine.addEntity>, maxDistance: number): void {
  const pe = PointerEvents.getMutableOrNull(entity)
  if (!pe) return
  for (const evt of pe.pointerEvents) {
    if (evt.eventInfo) evt.eventInfo.maxDistance = maxDistance
  }
}

export function setPointerHoverText(entity: ReturnType<typeof engine.addEntity>, hoverText: string): void {
  const pe = PointerEvents.getMutableOrNull(entity)
  if (!pe) return
  for (const evt of pe.pointerEvents) {
    if (evt.eventInfo?.button === InputAction.IA_POINTER) {
      evt.eventInfo.hoverText = hoverText
      evt.eventInfo.showFeedback = true
      evt.eventInfo.showHighlight = true
    }
  }
}
