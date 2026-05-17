import { engine, pointerEventsSystem, InputAction, PointerEventType, inputSystem, PointerEvents, VisibilityComponent } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { hostPickFortune } from './fortuneFsm/actions'
import { playButtonClick } from './fortuneSync'
import { fsmSession } from './fortuneFsm/session'
import type { FsmCardChoice } from './fortuneFsm/types'

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

    pointerEventsSystem.removeOnPointerDown(entity)

    pointerEventsSystem.onPointerDown(
      {
        entity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: config.label,
          maxDistance: 16,
          showFeedback: true,
          showHighlight: true
        }
      },
      () => {
        const localUserId = getPlayer()?.userId ?? null
        if (!localUserId || gameData.currentFortuneTellerId !== localUserId) return
        playButtonClick()
        hostPickFortune(config.choice)
      }
    )

    const pe = PointerEvents.getMutableOrNull(entity)
    if (pe) {
      pe.pointerEvents.push({
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: InputAction.IA_PRIMARY,
          hoverText: '',
          maxDistance: 16,
          showFeedback: false,
          showHighlight: false
        }
      })
    }

    DECK_MEANINGS.push({ ...config, entity })
  }

  console.log(`[setupDeckMeanings] Successfully setup ${foundCount} meaning cards`)

  // Manage visibility and pointer interactivity based on FSM state
  engine.addSystem(() => {
    const shouldShow = fsmSession.state === 'FORTUNE_SELECTION'

    for (const card of DECK_MEANINGS) {
      // Control visibility
      if (VisibilityComponent.has(card.entity)) {
        VisibilityComponent.getMutable(card.entity).visible = shouldShow
      }

      // Control pointer by adjusting maxDistance (0 = disabled)
      const pe = PointerEvents.getMutableOrNull(card.entity)
      if (pe && pe.pointerEvents.length > 0) {
        for (const evt of pe.pointerEvents) {
          if (evt.eventInfo) {
            evt.eventInfo.maxDistance = shouldShow ? 16 : 0
          }
        }
      }
    }
  })

  // Single system for all E key detections
  engine.addSystem(() => {
    if (fsmSession.state !== 'FORTUNE_SELECTION') return
    const localUserId = getPlayer()?.userId ?? null
    if (!localUserId || gameData.currentFortuneTellerId !== localUserId) return

    for (const config of DECK_MEANINGS) {
      if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, config.entity)) {
        playButtonClick()
        hostPickFortune(config.choice)
      }
    }
  })
}
