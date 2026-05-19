import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { hostPickFortune } from './fortuneFsm/actions'
import { playButtonClick } from './fortuneSync'
import type { FsmCardChoice } from './fortuneFsm/types'
import { registerPointerClickOnly } from './pointerClickUtil'

interface DeckCardForFortune {
  entityName: string
  entity: ReturnType<typeof engine.addEntity>
  choice: FsmCardChoice
  label: string
}

const DECK_CARDS_FOR_FORTUNE: DeckCardForFortune[] = []

export function setupDeckCardsForFortune(): void {
  console.log('[setupDeckCardsForFortune] Starting setup...')

  const deckConfigs = [
    { entityName: 'card_deck_01', choice: 'A' as FsmCardChoice, label: 'Prediction' },
    { entityName: 'card_deck_02', choice: 'B' as FsmCardChoice, label: 'Advice' },
    { entityName: 'card_deck_03', choice: 'C' as FsmCardChoice, label: 'Warning' }
  ]

  let foundCount = 0
  for (const config of deckConfigs) {
    const entity = engine.getEntityOrNullByName(config.entityName)
    console.log(`[setupDeckCardsForFortune] Looking for "${config.entityName}":`, entity ? 'FOUND' : 'NOT FOUND')
    if (!entity) {
      console.log(`[setupDeckCardsForFortune] Entity not found: "${config.entityName}"`)
      continue
    }
    foundCount++
    console.log(`[setupDeckCardsForFortune] [${foundCount}] Setting up ${config.label}`)

    registerPointerClickOnly(
      entity,
      { hoverText: config.label, maxDistance: 16 },
      () => {
        const localUserId = getPlayer()?.userId ?? null
        if (!localUserId || gameData.currentFortuneTellerId !== localUserId) return
        playButtonClick()
        hostPickFortune(config.choice)
      }
    )

    DECK_CARDS_FOR_FORTUNE.push({ ...config, entity })
  }

  console.log(`[setupDeckCardsForFortune] Successfully setup ${foundCount} deck cards`)
}
