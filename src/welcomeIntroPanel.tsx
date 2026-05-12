import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { CenteredLabelRow } from './centeredLabelRow'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { fsmSession } from './fortuneFsm/session'
import {
  CARD_VERTICAL_OFFSET,
  CARD_CONTENT_LAYER,
  CARD_ROOT_COLUMN,
  getCardSize
} from './cardLayout'

const WELCOME_BG = {
  texture: { src: 'assets/images/welcome.png' },
  textureMode: 'stretch' as const
}

const TITLE_FONT = 32
const SUB_FONT = 22
const TEXT_WHITE = Color4.White()
/** Alturas fijas para que el centrado X/Y del Label funcione (ver CenteredLabelRow). */
const WELCOME_TITLE_ROW_H = 56
const WELCOME_SUB_ROW_H = 48

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
       * Misma jerarquía que HostCardShell (fsmUi): marco getCardSize() + CARD_VERTICAL_OFFSET,
       * textura stretch, contenido absoluto en CARD_CONTENT_LAYER → CARD_ROOT_COLUMN (centro X/Y).
       */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
      >
        <UiEntity
          uiTransform={{
            ...getCardSize(),
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            margin: { top: CARD_VERTICAL_OFFSET },
            positionType: 'relative',
            overflow: 'visible'
          }}
          uiBackground={WELCOME_BG}
        >
          <UiEntity uiTransform={{ ...CARD_CONTENT_LAYER }}>
            <UiEntity uiTransform={{ ...CARD_ROOT_COLUMN }}>
              <CenteredLabelRow
                value="THE FORTUNE TELLER"
                fontSize={TITLE_FONT}
                color={TEXT_WHITE}
                height={WELCOME_TITLE_ROW_H}
                marginBottom={12}
              />
              <CenteredLabelRow
                value="Choose a chair to begin"
                fontSize={SUB_FONT}
                color={TEXT_WHITE}
                height={WELCOME_SUB_ROW_H}
              />
            </UiEntity>
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
