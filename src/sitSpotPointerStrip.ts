import { engine, PointerEvents } from '@dcl/sdk/ecs'

/** `InteractionType.PROXIMITY` — prompt de interacción por proximidad / tecla cercana. */
const INTERACTION_PROXIMITY = 1

function stripPointerEventsForSitSpot(entity: ReturnType<typeof engine.addEntity>): void {
  if (!PointerEvents.has(entity)) return
  const m = PointerEvents.getMutable(entity)
  m.pointerEvents = m.pointerEvents.filter((e) => {
    if ((e.interactionType ?? 0) === INTERACTION_PROXIMITY) return false
    const info = e.eventInfo
    if (!info) return true
    const ht = info.hoverText?.trim() ?? ''
    if (ht === 'Sit Here') return false
    return true
  })
}

/**
 * Quita del Sit Spot lo que muestra **E Press** / “Sit Here” vía `PointerEvents` del composite (sin tocar `asset-packs/` en disco):
 * entradas con `IA_PRIMARY` / `IA_SECONDARY`, `InteractionType.PROXIMITY`, y el hint “Sit Here”.
 * El componente `asset-packs::Triggers` es GrowOnly en el SDK → no se puede filtrar aquí; el prompt E suele ir ligado al `button` del pointer.
 * El clic sigue yendo por `pointerEventsSystem.onPointerDown` en `setupGuestSpot` / `setupWizard`.
 */
export function stripBuiltInSitSpotPointerUi(entity: ReturnType<typeof engine.addEntity>): void {
  stripPointerEventsForSitSpot(entity)
}
