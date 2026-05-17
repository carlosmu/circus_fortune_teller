import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'
import { GUEST_MAX_READINGS_PER_SEAT, GUEST_READING_IDLE_TIMEOUT_MS } from './fortuneSync'

/** Fondo #1e003a; borde magenta (mismo tono que botones de card.png). */
const STATUS_PANEL_BG = Color4.create(30 / 255, 0, 58 / 255, 1)
const STATUS_PANEL_BORDER = Color4.create(0.82, 0.28, 0.78, 0.42)
const STATUS_PANEL_BORDER_RADIUS = 12
const TEXT = Color4.White()
const TIMER_LABEL = 'Time:'
const FILLED_READING_SLOT = '♥'
const EMPTY_READING_SLOT = '-'
const FT_CRYSTAL_ICON_SRC = 'assets/images/icon-crystal-ball.png'
const GUEST_ICON_SRC = 'assets/images/icon-bust-in-silhouette.png'
/** Tamaño en layout UI para ambos iconos. */
const STATUS_ICON_SIZE = 22
/** Ancho útil del texto al lado del icono (fila 460px − icono − margen). Evita wrap raro que parecía “[]”. */
const STATUS_ROW_WIDTH = 580
const STATUS_TEXT_INNER_WIDTH = STATUS_ROW_WIDTH - STATUS_ICON_SIZE - 8

/**
 * Barra inferior centrada: Fortune Teller y Guest (lee gameData cada frame de UI).
 * zIndex 15: por encima de la capa FSM (z 12) a pantalla completa para no quedar tapada.
 */
export function FortuneTellerGuestStatusBar() {
  const ftPlayerName = gameData.currentFortuneTellerName
  const guestPlayerName = gameData.guestSeatUserName ?? gameData.currentGuestName
  const ftLabel = ftPlayerName ?? 'Waiting'
  const guestLabel = guestPlayerName ?? 'Waiting'
  const hasActiveFortuneTeller = gameData.currentFortuneTellerId !== null
  const hasSeatedGuest = gameData.guestSeatUserId !== null
  const timeSec = Math.max(0, Math.ceil(gameData.fortuneTellerTimeRemainingSec))
  const ftMaxReadings = gameData.fortuneTellerMaxReadings
  const filledCards = hasActiveFortuneTeller ? Math.min(ftMaxReadings, gameData.fortuneTellerReadingsDone) : 0
  const cards = `${FILLED_READING_SLOT.repeat(filledCards)}${EMPTY_READING_SLOT.repeat(ftMaxReadings - filledCards)}`
  const ftStatusText = hasActiveFortuneTeller
    ? `Fortune Teller: ${ftLabel} | ${TIMER_LABEL} ${timeSec}s | Readings: ${cards}`
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
      ? `Guest: ${guestLabel} | ${TIMER_LABEL} ${guestCountdownSec}s | Readings: ${guestCards}`
      : hasSeatedGuest
        ? `Guest: ${guestLabel} | Readings: ${guestCards}`
        : `Guest: ${guestLabel}`

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        positionType: 'absolute',
        position: { left: 0, bottom: 0 },
        margin: { bottom: 16 }, // 1.5vh @ 1080p ≈ 16px
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 15
      }}
    >
      <UiEntity
        uiTransform={{
          width: 600,
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
          borderRadius: STATUS_PANEL_BORDER_RADIUS,
          borderWidth: 1,
          borderColor: STATUS_PANEL_BORDER
        }}
        uiBackground={{ color: STATUS_PANEL_BG }}
      >
        <UiEntity
          uiTransform={{
            width: STATUS_ROW_WIDTH,
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
            uiTransform={{ width: STATUS_TEXT_INNER_WIDTH, height: 24 }}
            value={ftStatusText}
            textAlign="middle-left"
            fontSize={16}
            font="sans-serif"
            color={TEXT}
          />
        </UiEntity>
        <UiEntity
          uiTransform={{
            width: STATUS_ROW_WIDTH,
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
            uiTransform={{ width: STATUS_TEXT_INNER_WIDTH, height: 24 }}
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
