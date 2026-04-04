import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { SHOW_UI_FORTUNE, USE_FORTUNE_FSM_FLOW } from './sceneConfig'
import { FortuneFsmLayer } from './fortuneFsm/fsmUi'
import {
  fortuneTellerSuggestCategory,
  getFirstStepCategoryOptionsForUi,
  getGuestFallbackCategoryOptionsForUi,
  fortuneTellerInviteGuestToChooseTopic,
  fortuneTellerSubmitKind,
  guestAcceptSuggestedCategory,
  guestAcceptMoreFortune,
  guestCancelFortuneSession,
  guestDeclineMoreFortune,
  guestRejectSuggestedCategory,
  guestSubmitChosenCategory
} from './fortuneTellerSystem'
import { FortuneTellerGuestStatusBar } from './fortuneTellerGuestStatusUi'
import { cinematicBarAlpha } from './cinematicCamera'
import { repeatPromptForSeed } from './repeatFortunePrompt'
import { hashString, pickGuestMaxReadingsFarewellLine, pickThreeGuestCategoriesSeeded } from './revelationRng'
import type { FortuneCategory, FortuneKind, RevelationPhase } from './types'

let waitingPanelTime = 0
const WAITING_ALPHA_SPEED = 3
/** Vertical offset (px) applied to all card.png UI panels. Negative moves up. */
const CARD_UI_VERTICAL_OFFSET = '-100px'
/**
 * `card.png` es 1024×1024. Un solo tamaño fijo en px para todas las pantallas: el marco
 * no crece ni encoge entre estados, y stretch en un cuadrado igual al aspecto de la textura no deforma.
 */
const CARD_PANEL_PX = { width: '600px' as const, height: '600px' as const }
const CARD_TEXTURE_BACKGROUND = {
  texture: { src: 'assets/images/card.png' },
  textureMode: 'stretch' as const
}

/** Todo el contenido legible queda dentro del 75% central del panel carta. */
const CARD_CONTENT_WIDTH = '70%' as const
/** Altura explícita para que los % de hijos (p. ej. filas de botones) no colapsen a 0. */
const CARD_INNER_COLUMN = {
  width: CARD_CONTENT_WIDTH,
  height: '86%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  /** Ligero desplazamiento hacia abajo respecto al centro óptico de card.png */
  margin: { top: -80 } as const
}

/**
 * Apila texto/botones sin huecos; vive dentro de CARD_INNER_COLUMN (que centra el bloque en XY).
 */
const CARD_TIGHT_STACK = {
  width: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'flex-start' as const,
  /** stretch: los Label ocupan todo el ancho; si fuera center, el texto corto queda en caja estrecha y se ve “a la izquierda”. */
  alignItems: 'stretch' as const
}
/** Fila Yes/No (altura en px; más fiable que % anidados en el runtime UI). */
const CARD_BUTTON_ROW_HEIGHT_PX = 56
/** Fila de botones de categoría (invitado / adivino primer paso). */
const CARD_CATEGORY_ROW_HEIGHT_PX = 128
/** Columna de botones de tono (Warning / Advice / Prediction). */
const CARD_KINDS_STACK_HEIGHT_PX = 198

/** Diálogo principal y preguntas al jugador dentro de la carta. */
const CARD_FONT_PRIMARY = 22
/** Subtítulos (p. ej. categoría · tipo), instrucciones tipo “elige…”, y etiquetas de botones. */
const CARD_FONT_SECONDARY = 18

const CATEGORY_LABELS: Record<FortuneCategory, string> = {
  love: 'Love',
  money: 'Money',
  health: 'Health',
  work: 'Work',
  luck: 'Luck',
  travel: 'Travel',
  pets: 'Pets',
  family: 'Family',
  mystery: 'Mystery'
}

const KIND_LABELS: Record<FortuneKind, string> = {
  warning: 'Warning',
  advice: 'Advice',
  prediction: 'Prediction'
}

const KIND_ORDER: FortuneKind[] = ['warning', 'advice', 'prediction']

const legacyFortuneUi = SHOW_UI_FORTUNE && !USE_FORTUNE_FSM_FLOW

const WAITING_FORTUNE_LINES = [
  'Your fate is...',
  'Your destiny awaits...',
  'The cards have spoken...',
  'What lies ahead is...'
]

const GUEST_THEME_PROMPTS_BY_ITERATION = {
  1: ['Choose the thread you wish to reveal.'],
  2: ['We have touched one truth; choose another path.'],
  3: ['Final choice. The cards will not open again.']
} as const

function pickBySessionSalt(lines: readonly string[]): string {
  const guestId = gameData.currentGuestId ?? ''
  const seed = `${guestId}:${gameData.revelationRoundSalt}:${gameData.currentIteration}`
  return lines[hashString(seed) % lines.length]!
}

function guestThemePrompt(): string {
  return pickBySessionSalt(GUEST_THEME_PROMPTS_BY_ITERATION[gameData.currentIteration])
}

function repeatPromptLine(): string {
  const guestId = gameData.currentGuestId ?? ''
  const seed = `${guestId}:${gameData.revelationRoundSalt}:${gameData.currentIteration}`
  return repeatPromptForSeed(seed)
}

function getIntroLine(category: FortuneCategory): string {
  const byCategory: Record<FortuneCategory, string[]> = {
    love: [
      'I sense something stirring in your heart…',
      'Your heart is not at rest…',
      'There is a feeling you cannot ignore…'
    ],
    money: [
      'I sense unease in your fortune…',
      'Something shifts in your wealth…',
      'Your path with fortune is uncertain…'
    ],
    work: [
      'Your path of labor feels troubled…',
      'There is tension in your work…',
      'Your efforts may not lead where you expect…'
    ],
    health: [
      'Your strength wavers…',
      'I sense imbalance within you…',
      'Something in you seeks attention…'
    ],
    luck: [
      'Chance does not favor you equally…',
      'Luck turns in uncertain ways…',
      'Fortune flickers around you…'
    ],
    mystery: [
      'Something hidden surrounds you…',
      'There is more than meets the eye…',
      'A veil lingers over your path…'
    ],
    pets: ['Something hidden surrounds you…'],
    family: ['I sense something stirring in your heart…'],
    travel: ['Luck turns in uncertain ways…']
  }
  const variants = byCategory[category]
  const idx = hashString(`${category}:intro:${gameData.revelationRoundSalt}:${gameData.currentIteration}`) % variants.length
  return variants[idx]!
}

function getConfirmLine(category: FortuneCategory): string {
  const byCategory: Record<FortuneCategory, string[]> = {
    love: [
      'Shall I reveal what love holds for you?',
      'Shall I unveil what love holds for you?'
    ],
    money: [
      'Shall I reveal what fate holds for your wealth?',
      'Shall I reveal what destiny holds for your wealth?'
    ],
    work: [
      'Shall I reveal what lies ahead in your path of work?',
      'Shall I reveal what lies ahead in your work path?'
    ],
    health: [
      'Shall I reveal what lies ahead for your well-being?',
      'Shall I reveal what lies ahead for your balance and well-being?'
    ],
    luck: [
      'Shall I reveal how chance favors you?',
      'Shall I reveal how chance may favor you?'
    ],
    mystery: [
      'Shall I reveal what lies beyond the veil?',
      'Shall I reveal what waits beyond the veil?'
    ],
    pets: ['Shall I reveal what lies beyond the veil?'],
    family: ['Shall I reveal what love holds for you?'],
    travel: ['Shall I reveal how chance favors you?']
  }
  const variants = byCategory[category]
  const idx = hashString(`${category}:confirm:${gameData.revelationRoundSalt}:${gameData.currentIteration}`) % variants.length
  return variants[idx]!
}

function pickWaitingLine(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return WAITING_FORTUNE_LINES[hash % WAITING_FORTUNE_LINES.length]
}

function revelationWaitingCaption(
  phase: RevelationPhase,
  isGuest: boolean,
  isFortuneTeller: boolean,
  hasHumanFortuneTeller: boolean
): string {
  const priorLabel = gameData.previouslySelectedCategories[0]
    ? CATEGORY_LABELS[gameData.previouslySelectedCategories[0]]
    : null
  switch (phase) {
    case 'ft_asks_topic':
      if (hasHumanFortuneTeller) {
        if (isGuest) {
          if (gameData.currentIteration === 1) return 'The Fortune Teller is choosing a thread to ask you about...'
          if (gameData.currentIteration === 2 && priorLabel) {
            return `We've spoken of ${priorLabel.toLowerCase()}… now the Fortune Teller chooses another thread.`
          }
          return 'One final thread is being chosen. Listen closely...'
        }
        if (isFortuneTeller) return ''
        return 'Waiting for the Fortune Teller...'
      }
      if (isGuest) return 'The oracle is asking what you wish to know — a moment...'
      return 'The oracle is turning toward the guest...'
    case 'guest_chooses_category':
      if (isGuest) return ''
      return 'Waiting for the guest to choose a theme...'
    case 'guest_suggested_category_prompt':
      if (isGuest) return ''
      return 'Waiting for the guest to accept or reject the omen...'
    case 'ft_chooses_kind':
      if (hasHumanFortuneTeller) {
        if (isGuest) return 'The Fortune Teller is choosing how to phrase your fortune...'
        if (isFortuneTeller) return ''
        return 'Waiting for the Fortune Teller...'
      }
      if (isGuest) return 'The oracle is choosing warning, advice, or prediction...'
      return 'The oracle is shaping the guest\'s fortune...'
    default:
      return pickWaitingLine(`${gameData.currentGuestId ?? ''}:${gameData.currentGuestName ?? ''}`)
  }
}

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)

  engine.addSystem((dt: number) => {
    if (gameData.gameState === 'OCUPADO') {
      waitingPanelTime += dt * WAITING_ALPHA_SPEED
      gameData.waitingPanelAlpha = 0.5 + 0.5 * Math.sin(waitingPanelTime)
    } else {
      waitingPanelTime = 0
      gameData.waitingPanelAlpha = 1
    }
  })
}

function CinematicLetterbox({ alpha }: { alpha: number }) {
  const barColor = Color4.create(0, 0, 0, alpha)
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        zIndex: 0
      }}
    >
      <UiEntity uiTransform={{ width: '100%', height: '10%' }} uiBackground={{ color: barColor }} />
      <UiEntity uiTransform={{ width: '100%', height: '10%' }} uiBackground={{ color: barColor }} />
    </UiEntity>
  )
}

/** × en esquina superior derecha de la tarjeta card.png (solo invitado en lectura). */
function GuestCardCancelCorner(props: { show: boolean }) {
  if (!props.show) return null
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '4%', right: '5%' },
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.12, 0.12, 0.14, 0.88) }}
      onMouseDown={() => guestCancelFortuneSession()}
    >
      <Label
        uiTransform={{ width: '100%', height: '100%' }}
        value="×"
        textAlign="middle-center"
        fontSize={CARD_FONT_SECONDARY}
        font="sans-serif"
        color={Color4.create(0.95, 0.95, 0.95, 1)}
      />
    </UiEntity>
  )
}

function uiComponent() {
  const fortune = gameData.currentFortune
  const phase = gameData.revelationPhase
  const isVisible =
    legacyFortuneUi &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    !!fortune &&
    phase === 'fortune_display'

  const player = getPlayer()
  const isFortuneTeller =
    !!player && gameData.currentFortuneTellerId !== null && gameData.currentFortuneTellerId === player.userId
  const isGuest = !!player && gameData.currentGuestId !== null && gameData.currentGuestId === player.userId
  const hasHumanFortuneTeller = gameData.currentFortuneTellerId !== null
  const showGuestCancelButton =
    legacyFortuneUi &&
    isGuest &&
    (gameData.gameState === 'OCUPADO' || gameData.gameState === 'MOSTRANDO_FORTUNA')
  const showFtInvite =
    legacyFortuneUi &&
    gameData.gameState === 'OCUPADO' &&
    phase === 'ft_asks_topic' &&
    isFortuneTeller

  const showGuestCategories =
    legacyFortuneUi &&
    gameData.gameState === 'OCUPADO' &&
    phase === 'guest_chooses_category' &&
    isGuest
  const showGuestSuggestedPrompt =
    legacyFortuneUi &&
    gameData.gameState === 'OCUPADO' &&
    phase === 'guest_suggested_category_prompt' &&
    isGuest &&
    gameData.suggestedCategory !== null

  const showFtKinds =
    legacyFortuneUi &&
    gameData.gameState === 'OCUPADO' &&
    phase === 'ft_chooses_kind' &&
    isFortuneTeller

  const guestCategoryOptions =
    gameData.gameState === 'OCUPADO' && phase === 'guest_chooses_category'
      ? getGuestFallbackCategoryOptionsForUi()
      : null
  const guestCategoryAvailableOptions = guestCategoryOptions
    ? guestCategoryOptions
    : null
  const firstStepFtOptions =
    gameData.gameState === 'OCUPADO' && phase === 'ft_asks_topic' ? getFirstStepCategoryOptionsForUi() : []

  const activeOwnsInteraction =
    (isFortuneTeller && (phase === 'ft_asks_topic' || phase === 'ft_chooses_kind')) ||
    (isGuest && phase === 'guest_suggested_category_prompt') ||
    (isGuest && phase === 'guest_chooses_category') ||
    (isGuest && phase === 'guest_learn_more')

  const showWaitingPanel =
    legacyFortuneUi && gameData.gameState === 'OCUPADO' && !activeOwnsInteraction

  const showGuestLearnMore =
    legacyFortuneUi &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    phase === 'guest_learn_more' &&
    isGuest

  const showFortuneTellerLearnMorePrompt =
    legacyFortuneUi &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    phase === 'guest_learn_more' &&
    isFortuneTeller &&
    hasHumanFortuneTeller

  const showSpectatorLearnMoreWait =
    legacyFortuneUi &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    phase === 'guest_learn_more' &&
    !isGuest &&
    !isFortuneTeller

  const showFarewellMaxReadings =
    legacyFortuneUi &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    phase === 'guest_farewell_max_readings' &&
    gameData.currentGuestId !== null

  const maxReadingsFarewellLine = showFarewellMaxReadings
    ? pickGuestMaxReadingsFarewellLine(gameData.currentGuestId ?? '', gameData.revelationRoundSalt)
    : ''
  const repeatPrompt = repeatPromptLine()

  const waitingAlpha = gameData.waitingPanelAlpha
  const waitingCaption = revelationWaitingCaption(phase, isGuest, isFortuneTeller, hasHumanFortuneTeller)
  const guestName = gameData.currentGuestName ?? ''
  const waitingFortuneLine =
    waitingCaption || (guestName ? `${guestName}, ${pickWaitingLine(`${gameData.currentGuestId ?? ''}`)}` : pickWaitingLine(`${gameData.currentGuestId ?? ''}`))

  const text = fortune?.text ?? ''
  const category = fortune?.category ?? ''
  const kindLabel = fortune ? KIND_LABELS[fortune.type] : ''
  const capitalizedCategory =
    category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
  const fortuneText = guestName ? `${guestName}, ${text}` : text
  const nowMs = Date.now()
  const showCenterBanner =
    gameData.centerBannerText !== null && gameData.centerBannerUntilMs > nowMs

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'relative',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch'
      }}
    >
      {cinematicBarAlpha > 0 && <CinematicLetterbox alpha={cinematicBarAlpha} />}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          zIndex: 10
        }}
      >
      <FortuneTellerGuestStatusBar />

      <UiEntity
        uiTransform={{
          width: '40%',
          height: '10%',
          margin: { top: '2%', left: '2%' }
        }}
      >
        <Label
          uiTransform={{ width: '100%', height: '100%' }}
          value={`State: ${gameData.gameState === 'LIBRE' ? 'Free' : gameData.gameState === 'OCUPADO' ? 'Occupied' : 'Showing fortune'} · ${phase}`}
          textAlign="top-left"
          fontSize={14}
          font="serif"
        />
      </UiEntity>

      {showWaitingPanel && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <Label
                uiTransform={{
                  width: '100%',
                  height: '72%'
                }}
                value={waitingFortuneLine}
                textAlign="middle-center"
                textWrap="wrap"
                fontSize={CARD_FONT_PRIMARY}
                font="serif"
                color={Color4.create(1, 1, 1, waitingAlpha)}
              />
            </UiEntity>
            <GuestCardCancelCorner show={showGuestCancelButton && showWaitingPanel} />
          </UiEntity>
        </UiEntity>
      )}

      {isVisible && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <UiEntity uiTransform={{ ...CARD_TIGHT_STACK }}>
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Label
                    uiTransform={{
                      width: 'auto',
                      height: 'auto'
                    }}
                    value={kindLabel ? `${capitalizedCategory} · ${kindLabel}` : capitalizedCategory}
                    textAlign="middle-center"
                    textWrap="wrap"
                    fontSize={CARD_FONT_SECONDARY}
                    font="serif"
                    color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
                  />
                </UiEntity>

                <Label
                  uiTransform={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '68%',
                    margin: { top: 8 }
                  }}
                  value={fortuneText}
                  textAlign="middle-center"
                  textWrap="wrap"
                  fontSize={CARD_FONT_PRIMARY}
                  font="serif"
                />
              </UiEntity>
            </UiEntity>
            <GuestCardCancelCorner show={showGuestCancelButton && isVisible} />
          </UiEntity>
        </UiEntity>
      )}

      {showFarewellMaxReadings && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <Label
                uiTransform={{ width: '100%', height: '75%' }}
                value={maxReadingsFarewellLine}
                textAlign="middle-center"
                textWrap="wrap"
                fontSize={CARD_FONT_PRIMARY}
                font="serif"
                color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
              />
            </UiEntity>
            <GuestCardCancelCorner show={showGuestCancelButton && showFarewellMaxReadings} />
          </UiEntity>
        </UiEntity>
      )}

      {showFortuneTellerLearnMorePrompt && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <UiEntity uiTransform={{ ...CARD_TIGHT_STACK }}>
                <Label
                  uiTransform={{ width: '100%', height: 'auto' }}
                  value={repeatPrompt}
                  textAlign="top-center"
                  textWrap="wrap"
                  fontSize={CARD_FONT_PRIMARY}
                  font="serif"
                  color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
                />
                <Label
                  uiTransform={{ width: '100%', height: 'auto', margin: { top: 12 } }}
                  value="Ask the guest. They will choose Yes or No."
                  textAlign="top-center"
                  textWrap="wrap"
                  fontSize={CARD_FONT_SECONDARY}
                  font="serif"
                />
              </UiEntity>
            </UiEntity>
          </UiEntity>
        </UiEntity>
      )}

      {showSpectatorLearnMoreWait && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <Label
                uiTransform={{ width: '100%', height: '70%' }}
                value="The guest decides whether to hear another reading..."
                textAlign="middle-center"
                textWrap="wrap"
                fontSize={CARD_FONT_SECONDARY}
                font="serif"
              />
            </UiEntity>
          </UiEntity>
        </UiEntity>
      )}

      {showGuestLearnMore && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <UiEntity uiTransform={{ ...CARD_TIGHT_STACK }}>
                <Label
                  uiTransform={{ width: '100%', height: 'auto' }}
                  value={repeatPrompt}
                  textAlign="top-center"
                  textWrap="wrap"
                  fontSize={CARD_FONT_PRIMARY}
                  font="serif"
                  color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
                />
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: CARD_BUTTON_ROW_HEIGHT_PX,
                    margin: { top: 12 },
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    alignItems: 'stretch'
                  }}
                >
                  <UiEntity
                    uiTransform={{ width: '46%', height: '100%' }}
                    uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                    onMouseDown={() => guestAcceptMoreFortune()}
                  >
                    <Label
                      uiTransform={{ width: '100%', height: '100%' }}
                      value="Yes"
                      textAlign="middle-center"
                      fontSize={CARD_FONT_SECONDARY}
                      font="serif"
                    />
                  </UiEntity>
                  <UiEntity
                    uiTransform={{ width: '46%', height: '100%' }}
                    uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                    onMouseDown={() => guestDeclineMoreFortune()}
                  >
                    <Label
                      uiTransform={{ width: '100%', height: '100%' }}
                      value="No"
                      textAlign="middle-center"
                      fontSize={CARD_FONT_SECONDARY}
                      font="serif"
                    />
                  </UiEntity>
                </UiEntity>
              </UiEntity>
            </UiEntity>
            <GuestCardCancelCorner show={showGuestCancelButton && showGuestLearnMore} />
          </UiEntity>
        </UiEntity>
      )}

      {showFtInvite && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <UiEntity uiTransform={{ ...CARD_TIGHT_STACK }}>
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Label
                    uiTransform={{ width: 'auto', height: 'auto' }}
                    value={'Choose one thread to ask the guest about:'}
                    textAlign="middle-center"
                    textWrap="wrap"
                    fontSize={CARD_FONT_SECONDARY}
                    font="serif"
                    color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
                  />
                </UiEntity>
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: CARD_CATEGORY_ROW_HEIGHT_PX,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    margin: { top: 8 }
                  }}
                >
                  {firstStepFtOptions.map((cat, index) => (
                    <UiEntity
                      key={`${cat}:${index}`}
                      uiTransform={{
                        width: '20%',
                        height: '80%',
                        margin: { left: 5, right: 5 }
                      }}
                      uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                      onMouseDown={() => fortuneTellerSuggestCategory(cat)}
                    >
                      <Label
                        uiTransform={{ width: '100%', height: '100%' }}
                        value={CATEGORY_LABELS[cat]}
                        textAlign="middle-center"
                        textWrap="wrap"
                        fontSize={CARD_FONT_SECONDARY}
                        font="serif"
                      />
                    </UiEntity>
                  ))}
                </UiEntity>
              </UiEntity>
            </UiEntity>
          </UiEntity>
        </UiEntity>
      )}

      {showGuestSuggestedPrompt && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <UiEntity uiTransform={{ ...CARD_TIGHT_STACK }}>
                <Label
                  uiTransform={{ width: '100%', height: 'auto' }}
                  value={getConfirmLine(gameData.suggestedCategory!)}
                  textAlign="top-center"
                  textWrap="wrap"
                  fontSize={CARD_FONT_PRIMARY}
                  font="serif"
                  color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
                />
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: CARD_BUTTON_ROW_HEIGHT_PX,
                    margin: { top: 12 },
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    alignItems: 'stretch'
                  }}
                >
                <UiEntity
                  uiTransform={{ width: '46%', height: '100%' }}
                  uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                  onMouseDown={() => guestAcceptSuggestedCategory()}
                >
                  <Label
                    uiTransform={{ width: '100%', height: '100%' }}
                    value="Yes"
                    textAlign="middle-center"
                    fontSize={CARD_FONT_SECONDARY}
                    font="serif"
                  />
                </UiEntity>
                <UiEntity
                  uiTransform={{ width: '46%', height: '100%' }}
                  uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                  onMouseDown={() => guestRejectSuggestedCategory()}
                >
                  <Label
                    uiTransform={{ width: '100%', height: '100%' }}
                    value="No"
                    textAlign="middle-center"
                    fontSize={CARD_FONT_SECONDARY}
                    font="serif"
                  />
                </UiEntity>
              </UiEntity>
              </UiEntity>
            </UiEntity>
            <GuestCardCancelCorner show={showGuestCancelButton && showGuestSuggestedPrompt} />
          </UiEntity>
        </UiEntity>
      )}

      {showGuestCategories && guestCategoryAvailableOptions && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <Label
                uiTransform={{ width: '100%', height: '16%' }}
                value={guestThemePrompt()}
                textAlign="middle-center"
                textWrap="wrap"
                fontSize={CARD_FONT_SECONDARY}
                font="serif"
                color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
              />
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: CARD_CATEGORY_ROW_HEIGHT_PX,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'stretch',
                  margin: { top: 8 }
                }}
              >
                {guestCategoryAvailableOptions.map((cat, index) => (
                  <UiEntity
                    key={cat}
                    uiTransform={{
                      width: '20%',
                      height: '80%',
                      margin: { left: 5, right: 5 }
                    }}
                    uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                    onMouseDown={() => guestSubmitChosenCategory(cat)}
                  >
                    <Label
                      uiTransform={{ width: '100%', height: '100%' }}
                      value={`${index + 1}\n${CATEGORY_LABELS[cat]}`}
                      textAlign="middle-center"
                      textWrap="wrap"
                      fontSize={CARD_FONT_SECONDARY}
                      font="serif"
                    />
                  </UiEntity>
                ))}
              </UiEntity>
              {gameData.categoryRejectionLine !== null && (
                <Label
                  uiTransform={{ width: '100%', height: '22%', margin: { top: 8 } }}
                  value={gameData.categoryRejectionLine}
                  textAlign="middle-center"
                  textWrap="wrap"
                  fontSize={CARD_FONT_SECONDARY}
                  font="serif"
                  color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
                />
              )}
            </UiEntity>
            <GuestCardCancelCorner show={showGuestCancelButton && showGuestCategories} />
          </UiEntity>
        </UiEntity>
      )}

      {showFtKinds && (
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
              ...CARD_PANEL_PX,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              margin: { top: CARD_UI_VERTICAL_OFFSET },
              positionType: 'relative'
            }}
            uiBackground={CARD_TEXTURE_BACKGROUND}
          >
            <UiEntity uiTransform={{ ...CARD_INNER_COLUMN }}>
              <UiEntity uiTransform={{ ...CARD_TIGHT_STACK }}>
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Label
                    uiTransform={{ width: 'auto', height: 'auto' }}
                    value="Choose the tone of the reading:"
                    textAlign="middle-center"
                    textWrap="wrap"
                    fontSize={CARD_FONT_SECONDARY}
                    font="serif"
                    color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
                  />
                </UiEntity>
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: CARD_KINDS_STACK_HEIGHT_PX,
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    alignItems: 'stretch',
                    margin: { top: 8 }
                  }}
                >
                  {KIND_ORDER.map((kind) => (
                    <UiEntity
                      key={kind}
                      uiTransform={{ width: '100%', height: CARD_BUTTON_ROW_HEIGHT_PX }}
                      uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                      onMouseDown={() => fortuneTellerSubmitKind(kind)}
                    >
                      <Label
                        uiTransform={{ width: '100%', height: '100%' }}
                        value={KIND_LABELS[kind]}
                        textAlign="middle-center"
                        textWrap="wrap"
                        fontSize={CARD_FONT_SECONDARY}
                        font="serif"
                      />
                    </UiEntity>
                  ))}
                </UiEntity>
              </UiEntity>
            </UiEntity>
          </UiEntity>
        </UiEntity>
      )}

      {showCenterBanner && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '100%',
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <UiEntity
            uiTransform={{
              width: '80%',
              height: '16%',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            uiBackground={{ color: Color4.create(0, 0, 0, 0.5) }}
          >
            <Label
              uiTransform={{ width: '92%', height: '80%' }}
              value={gameData.centerBannerText ?? ''}
              textAlign="middle-center"
              fontSize={30}
              font="sans-serif"
              color={Color4.White()}
            />
          </UiEntity>
        </UiEntity>
      )}
      <FortuneFsmLayer />
      </UiEntity>
    </UiEntity>
  )
}
