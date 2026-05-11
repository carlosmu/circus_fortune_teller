import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'
import { GUEST_MAX_READINGS_PER_SEAT, GUEST_READING_IDLE_TIMEOUT_MS } from './fortuneSync'

/** Mismo fondo y radio que el panel del `InfoBanner` (`BANNER_BG` + `borderRadius: 12`). */
const STATUS_PANEL_BG = Color4.create(0.35, 0.08, 0.55, 0.92)
const STATUS_PANEL_BORDER_RADIUS = 12
const TEXT = Color4.White()
const TIMER_LABEL = 'Time:'
const FILLED_READING_SLOT = '♥'
const EMPTY_READING_SLOT = '-'
const FT_CRYSTAL_ICON_SRC = 'assets/images/icon-crystal-ball.png'
const GUEST_ICON_SRC = 'assets/images/icon-bust-in-silhouette.png'
/** Tamaño en layout UI para ambos iconos. */
const STATUS_ICON_SIZE = 22

/**
 * Barra inferior centrada: Fortune Teller y Guest (lee gameData cada frame de UI).
 * zIndex 15: por encima de la capa FSM (z 12) a pantalla completa para no quedar tapada.
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
  const ftStatusText = hasActiveFortuneTeller
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
        positionType: 'absolute',
        position: { left: 0, bottom: 0 },
        margin: { bottom: '1.5vh' },
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 15
      }}
    >
      <UiEntity
        uiTransform={{
          width: 480,
          height: 72,
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
      >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { top: 8, bottom: 8, left: 16, right: 16 },
          borderRadius: STATUS_PANEL_BORDER_RADIUS
        }}
        uiBackground={{ color: STATUS_PANEL_BG }}
      >
        <UiEntity
          uiTransform={{
            width: 460,
            height: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <UiEntity
            uiTransform={{
              width: STATUS_ICON_SIZE,
              height: STATUS_ICON_SIZE,
              margin: { right: 8 }
            }}
            uiBackground={{
              color: Color4.White(),
              texture: { src: FT_CRYSTAL_ICON_SRC },
              textureMode: 'stretch'
            }}
          />
          <Label
            uiTransform={{ width: 600 - STATUS_ICON_SIZE - 8, height: 24 }}
            value={ftStatusText}
            textAlign="middle-left"
            fontSize={16}
            font="sans-serif"
            color={TEXT}
          />
        </UiEntity>
        <UiEntity
          uiTransform={{
            width: 460,
            height: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            margin: { top: 2 }
          }}
        >
          <UiEntity
            uiTransform={{
              width: STATUS_ICON_SIZE,
              height: STATUS_ICON_SIZE,
              margin: { right: 8 }
            }}
            uiBackground={{
              color: Color4.White(),
              texture: { src: GUEST_ICON_SRC },
              textureMode: 'stretch'
            }}
          />
          <Label
            uiTransform={{ width: 600 - STATUS_ICON_SIZE - 8, height: 24 }}
            value={guestStatusLine}
            textAlign="middle-left"
            fontSize={16}
            font="sans-serif"
            color={TEXT}
          />
        </UiEntity>
      </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
