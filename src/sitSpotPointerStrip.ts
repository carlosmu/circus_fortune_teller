import { engine } from '@dcl/sdk/ecs'
import { stripBuiltInPointerUi } from './pointerClickUtil'

/**
 * Quita del Sit Spot prompts E / “Sit Here” del composite (sin tocar `asset-packs/` en disco).
 * El clic va por `registerPointerClickOnly` en `setupGuestSpot` / `setupWizard`.
 */
export function stripBuiltInSitSpotPointerUi(entity: ReturnType<typeof engine.addEntity>): void {
  stripBuiltInPointerUi(entity)
}
