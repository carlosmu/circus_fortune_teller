import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'
import { GUEST_MAX_READINGS_PER_SEAT, GUEST_READING_IDLE_TIMEOUT_MS } from './fortuneSync'

const BG = Color4.create(0.05, 0.05, 0.08, 0.82)
const TEXT = Color4.White()
const TIMER_LABEL = 'Time:'
const FILLED_READING_SLOT = '♥'
const EMPTY_READING_SLOT = '-'

/**
 * Barra fija arriba al centro: Fortune Teller y Guest (reactivo: lee gameData cada frame de UI).
 */
export function FortuneTellerGuestStatusBar() {
  const ftPlayerName = gameData.currentFortuneTellerName
  const guestPlayerName = gameData.guestSeatUserName ?? gameData.currentGuestName
  const ftLabel = ftPlayerName ?? 'Free'
  const guestLabel = guestPlayerName ?? 'Free'
  const hasActiveFortuneTeller = gameData.currentFortuneTellerId !== null
  const hasSeatedGuest = gameData.guestSeatUserId !== null
  const timeSec = Math.max(0, Math.ceil(gameData.fortuneTellerTimeRemainingSec))
  const filledCards = hasActiveFortuneTeller ? Math.min(3, gameData.fortuneTellerReadingsDone) : 0
  const cards = `${FILLED_READING_SLOT.repeat(filledCards)}${EMPTY_READING_SLOT.repeat(3 - filledCards)}`
  const ftStatusLine = hasActiveFortuneTeller
    ? `Fortune Teller: ${ftLabel} | ${TIMER_LABEL} ${timeSec}s | Readings: [${cards}]`
    : `Fortune Teller: ${ftLabel}`
  const guestReadingsFilled = hasSeatedGuest
    ? Math.min(GUEST_MAX_READINGS_PER_SEAT, gameData.guestReadingsUsedThisSeat)
    : 0
  const guestCards = `${FILLED_READING_SLOT.repeat(guestReadingsFilled)}${EMPTY_READING_SLOT.repeat(
    GUEST_MAX_READINGS_PER_SEAT - guestReadingsFilled
  )}`
  const guestCountdownSec =
    gameData.gameState === 'OCUPADO' && gameData.guestLastInteractionAtMs !== null
      ? Math.max(
          0,
          Math.ceil((GUEST_READING_IDLE_TIMEOUT_MS - (Date.now() - gameData.guestLastInteractionAtMs)) / 1000)
        )
      : null
  const guestStatusLine =
    hasSeatedGuest && guestCountdownSec !== null
      ? `Guest: ${guestLabel} | ${TIMER_LABEL} ${guestCountdownSec}s | Readings: [${guestCards}]`
      : hasSeatedGuest
        ? `Guest: ${guestLabel} | Readings: [${guestCards}]`
        : `Guest: ${guestLabel}`

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        margin: { top: '1.5%' }
      }}
    >
      <UiEntity
        uiTransform={{
          width: 620,
          height: 60,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { top: 8, bottom: 8, left: 16, right: 16 }
        }}
        uiBackground={{ color: BG }}
      >
        <Label
          uiTransform={{ width: 600, height: 22 }}
          value={ftStatusLine}
          textAlign="middle-center"
          fontSize={16}
          font="sans-serif"
          color={TEXT}
        />
        <Label
          uiTransform={{ width: 600, height: 22 }}
          value={guestStatusLine}
          textAlign="middle-center"
          fontSize={16}
          font="sans-serif"
          color={TEXT}
        />
      </UiEntity>
    </UiEntity>
  )
}
