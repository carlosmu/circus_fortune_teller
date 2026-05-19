import { engine } from '@dcl/sdk/ecs'
import { stripBuiltInPointerUi } from './pointerClickUtil'
import { disableBuiltInSitOnKeyPress } from './sitSpotBuiltInSitDisable'

/**
 * Quita del Sit Spot E / “Sit Here” del smart item (PointerEvents + Triggers on_input_action).
 * El asiento solo por clic en `setupGuestSpot` / `setupWizard`.
 */
export function stripBuiltInSitSpotPointerUi(entity: ReturnType<typeof engine.addEntity>): void {
  stripBuiltInPointerUi(entity)
  disableBuiltInSitOnKeyPress(entity)
}
