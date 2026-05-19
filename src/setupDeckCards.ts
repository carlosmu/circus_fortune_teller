import { engine, VisibilityComponent } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { hostPickDeck } from './fortuneFsm/actions'
import { playButtonClick } from './fortuneSync'
import { fsmSession } from './fortuneFsm/session'
import type { FsmDeck } from './fortuneFsm/types'
import { fireSmokeIfCardRevealed } from './smokeParticles'
import { registerPointerClickOnly, setPointerMaxDistance } from './pointerClickUtil'

interface DeckCardConfig {
  entityName: string
  entity: ReturnType<typeof engine.addEntity>
  deck: FsmDeck
  label: string
}

const DECK_CARDS: DeckCardConfig[] = []


export function setupDeckCards(): void {
  console.log('[setupDeckCards] Starting setup...')

  const deckConfigs = [
    { entityName: 'card_deck_01', deck: 'Funny' as FsmDeck, label: 'Funny' },
    { entityName: 'card_deck_02', deck: 'Serious' as FsmDeck, label: 'Serious' },
    { entityName: 'card_deck_03', deck: 'Strange' as FsmDeck, label: 'Strange' }
  ]

  let foundCount = 0
  for (const config of deckConfigs) {
    const entity = engine.getEntityOrNullByName(config.entityName)
    console.log(`[setupDeckCards] Looking for "${config.entityName}":`, entity ? 'FOUND' : 'NOT FOUND')
    if (!entity) {
      console.log(`[setupDeckCards] Entity not found: "${config.entityName}"`)
      continue
    }
    foundCount++
    console.log(`[setupDeckCards] [${foundCount}] Setting up ${config.label}`)

    registerPointerClickOnly(
      entity,
      { hoverText: config.label, maxDistance: 16 },
      () => {
        const localUserId = getPlayer()?.userId ?? null
        if (!localUserId || gameData.currentFortuneTellerId !== localUserId) return
        playButtonClick()
        hostPickDeck(config.deck)
      }
    )

    DECK_CARDS.push({ ...config, entity })
  }

  console.log(`[setupDeckCards] Successfully setup ${foundCount} deck cards`)

  // Manage visibility and pointer interactivity based on FSM state
  engine.addSystem(() => {
    const shouldShow = fsmSession.state === 'DECK_SELECTION'

    for (const card of DECK_CARDS) {
      if (VisibilityComponent.has(card.entity)) {
        const vis = VisibilityComponent.getMutable(card.entity)
        const wasVisible = vis.visible ?? false
        vis.visible = shouldShow
        fireSmokeIfCardRevealed(card.entity, shouldShow, wasVisible)
      }

      // Control pointer by adjusting maxDistance (0 = disabled)
      setPointerMaxDistance(card.entity, shouldShow ? 16 : 0)
    }
  })
}
