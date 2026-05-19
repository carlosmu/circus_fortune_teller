import { engine, VisibilityComponent } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { guestPickCard } from './fortuneFsm/actions'
import { playButtonClick } from './fortuneSync'
import { fsmSession } from './fortuneFsm/session'
import type { FsmCardChoice } from './fortuneFsm/types'
import { fireSmokeIfCardRevealed } from './smokeParticles'
import { registerPointerClickOnly, setPointerMaxDistance } from './pointerClickUtil'

interface CardConfig {
  entityName: string
  entity: ReturnType<typeof engine.addEntity>
  slot: FsmCardChoice
  idx: 0 | 1 | 2
  label: string
}

const CARDS: CardConfig[] = []

export function setupCards(): void {
  console.log('[setupCards] Starting setup...')

  const cardConfigs = [
    { entityName: 'card_01', slot: 'A' as FsmCardChoice, idx: 0 as const, label: 'Card A' },
    { entityName: 'card_02', slot: 'B' as FsmCardChoice, idx: 1 as const, label: 'Card B' },
    { entityName: 'card_03', slot: 'C' as FsmCardChoice, idx: 2 as const, label: 'Card C' }
  ]

  let foundCount = 0
  for (const config of cardConfigs) {
    const entity = engine.getEntityOrNullByName(config.entityName)
    console.log(`[setupCards] Looking for "${config.entityName}":`, entity ? 'FOUND' : 'NOT FOUND')
    if (!entity) {
      console.log(`[setupCards] Entity not found: "${config.entityName}"`)
      continue
    }
    foundCount++

    registerPointerClickOnly(
      entity,
      { hoverText: config.label, maxDistance: 16 },
      () => {
        const localUserId = getPlayer()?.userId ?? null
        if (!localUserId || gameData.currentGuestId !== localUserId) return
        playButtonClick()
        guestPickCard(config.slot, config.idx)
      }
    )

    CARDS.push({ ...config, entity })
  }

  console.log(`[setupCards] Successfully setup ${foundCount} cards`)

  engine.addSystem(() => {
    const shouldShow = fsmSession.state === 'CARD_SELECTION'

    for (const card of CARDS) {
      if (VisibilityComponent.has(card.entity)) {
        const vis = VisibilityComponent.getMutable(card.entity)
        const wasVisible = vis.visible ?? false
        vis.visible = shouldShow
        fireSmokeIfCardRevealed(card.entity, shouldShow, wasVisible)
      }

      setPointerMaxDistance(card.entity, shouldShow ? 16 : 0)
    }
  })
}
