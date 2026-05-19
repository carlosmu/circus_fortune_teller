import { engine, VisibilityComponent } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { hostPickFortune } from './fortuneFsm/actions'
import { playButtonClick } from './fortuneSync'
import { fsmSession } from './fortuneFsm/session'
import type { FsmCardChoice } from './fortuneFsm/types'
import { fireSmokeIfCardRevealed } from './smokeParticles'
import { registerPointerClickOnly, setPointerMaxDistance } from './pointerClickUtil'

interface DeckMeaningConfig {
  entityName: string
  entity: ReturnType<typeof engine.addEntity>
  choice: FsmCardChoice
  label: string
}

const DECK_MEANINGS: DeckMeaningConfig[] = []


export function setupDeckMeanings(): void {
  console.log('[setupDeckMeanings] Starting setup...')

  const meaningConfigs = [
    { entityName: 'card_meaning_01', choice: 'A' as FsmCardChoice, label: 'Prediction' },
    { entityName: 'card_meaning_02', choice: 'B' as FsmCardChoice, label: 'Advice' },
    { entityName: 'card_meaning_03', choice: 'C' as FsmCardChoice, label: 'Warning' }
  ]

  let foundCount = 0
  for (const config of meaningConfigs) {
    const entity = engine.getEntityOrNullByName(config.entityName)
    console.log(`[setupDeckMeanings] Looking for "${config.entityName}":`, entity ? 'FOUND' : 'NOT FOUND')
    if (!entity) {
      console.log(`[setupDeckMeanings] Entity not found: "${config.entityName}"`)
      continue
    }
    foundCount++
    console.log(`[setupDeckMeanings] [${foundCount}] Setting up ${config.label}`)

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

    DECK_MEANINGS.push({ ...config, entity })
  }

  console.log(`[setupDeckMeanings] Successfully setup ${foundCount} meaning cards`)

  // Manage visibility and pointer interactivity based on FSM state
  engine.addSystem(() => {
    const shouldShow = fsmSession.state === 'FORTUNE_SELECTION'

    for (const card of DECK_MEANINGS) {
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
