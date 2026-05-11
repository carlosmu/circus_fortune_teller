import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { INFO_BANNER_BG } from './infoBanner'
import { fsmSession } from './fortuneFsm/session'

const PANEL_W = 480
const PANEL_H = 200
const BORDER_RADIUS = 12
const TITLE_FONT = 32
const SUB_FONT = 22
const TEXT_WHITE = Color4.White()

/** Tras haberse sentado alguna vez: volver a mostrar el cartel si no hay lectura y el jugador no está en silla durante este tiempo. */
const INTRO_IDLE_RESHOW_MS = 22_000

let localPlayerSatThisSession = false
let noReadingNotInChairSinceMs: number | null = null

function isGlobalReadingActive(): boolean {
  return (
    gameData.gameState === 'OCUPADO' ||
    gameData.gameState === 'MOSTRANDO_FORTUNA' ||
    fsmSession.active
  )
}

/**
 * Cartel inicial / recordatorio: visible al entrar si no hay lectura; se oculta al sentarse;
 * puede reaparecer tras inactividad global (nadie en lectura) si el jugador no está en silla.
 */
export function getWelcomeIntroVisible(): boolean {
  const me = getPlayer()?.userId ?? null
  if (me === null) return false

  const inChair =
    gameData.guestSeatUserId === me || gameData.currentFortuneTellerId === me
  const reading = isGlobalReadingActive()

  if (inChair) {
    localPlayerSatThisSession = true
  }

  if (reading || inChair) {
    noReadingNotInChairSinceMs = null
    return false
  }

  if (noReadingNotInChairSinceMs === null) {
    noReadingNotInChairSinceMs = Date.now()
  }

  const idleMs = Date.now() - noReadingNotInChairSinceMs
  if (!localPlayerSatThisSession) {
    return true
  }
  return idleMs >= INTRO_IDLE_RESHOW_MS
}

export function WelcomeIntroPanel() {
  if (!getWelcomeIntroVisible()) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        zIndex: 13
      }}
    >
      {/*
       * Misma columna que la carta FSM: flex-start + centrado en X; margen superior explícito.
       */}
      <UiEntity
        uiTransform={{
          width: PANEL_W,
          height: PANEL_H,
          margin: { top: '5vh' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { top: 20, bottom: 20, left: 24, right: 24 },
          borderRadius: BORDER_RADIUS
        }}
        uiBackground={{ color: INFO_BANNER_BG }}
      >
        <Label
          uiTransform={{ width: '100%', height: 'auto', margin: { bottom: 12 } }}
          value="THE FORTUNE TELLER"
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={TITLE_FONT}
          font="serif"
          color={TEXT_WHITE}
        />
        <Label
          uiTransform={{ width: '100%', height: 'auto' }}
          value="Choose a chair to begin"
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={SUB_FONT}
          font="serif"
          color={TEXT_WHITE}
        />
      </UiEntity>
    </UiEntity>
  )
}
