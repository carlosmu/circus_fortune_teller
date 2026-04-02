import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { SHOW_UI_FORTUNE } from './sceneConfig'
import {
  fortuneTellerInviteGuestToChooseTopic,
  fortuneTellerSubmitKind,
  guestAcceptMoreFortune,
  guestDeclineMoreFortune,
  guestSubmitChosenCategory
} from './fortuneTellerSystem'
import { FortuneTellerGuestStatusBar } from './fortuneTellerGuestStatusUi'
import { cinematicBarAlpha } from './cinematicCamera'
import { hashString, pickGuestMaxReadingsFarewellLine, pickThreeGuestCategoriesSeeded } from './revelationRng'
import type { FortuneCategory, FortuneKind, RevelationPhase } from './types'

let waitingPanelTime = 0
const WAITING_ALPHA_SPEED = 3
/** Vertical offset (px) applied to all card.png UI panels. Negative moves up. */
const CARD_UI_VERTICAL_OFFSET = '-100px'

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
  advertencia: 'Warning',
  consejo: 'Advice',
  prediccion: 'Prediction'
}

const KIND_ORDER: FortuneKind[] = ['advertencia', 'consejo', 'prediccion']

const WAITING_FORTUNE_LINES = [
  'Your fate is...',
  'Your destiny awaits...',
  'The cards have spoken...',
  'What lies ahead is...'
]

const HOST_TOPIC_PROMPTS_BY_ITERATION = {
  1: [
    'I sense matters of the heart… or something deeper.',
    'Is it love… or something heavier that troubles you?'
  ],
  2: [
    "We've spoken of one path… now another calls.",
    'Another thread reveals itself. Choose with care.'
  ],
  3: [
    'One final veil remains. Choose what must be known.',
    'The last card waits. Speak your final concern.'
  ]
} as const

const GUEST_THEME_PROMPTS_BY_ITERATION = {
  1: ['Choose the thread you wish to reveal.'],
  2: ['We have touched one truth; choose another path.'],
  3: ['Final choice. The cards will not open again.']
} as const

const REPEAT_PROMPT_OPTIONS = [
  'Shall we look deeper?',
  'Would you dare to know more?',
  'The cards still whisper… shall I listen?',
  'There is more to uncover… will you hear it?',
  'Do you wish me to go on?',
  'Another thread awaits… shall I pull it?',
  'The veil has not fully lifted… continue?',
  'I can see further… if you allow it.',
  'The future stirs again… shall I reveal it?',
  'One more glimpse… do you seek it?'
] as const

function pickBySessionSalt(lines: readonly string[]): string {
  const guestId = gameData.currentGuestId ?? ''
  const seed = `${guestId}:${gameData.revelationRoundSalt}:${gameData.currentIteration}`
  return lines[hashString(seed) % lines.length]!
}

function hostTopicPrompt(): string {
  return pickBySessionSalt(HOST_TOPIC_PROMPTS_BY_ITERATION[gameData.currentIteration])
}

function guestThemePrompt(): string {
  return pickBySessionSalt(GUEST_THEME_PROMPTS_BY_ITERATION[gameData.currentIteration])
}

function repeatPromptLine(): string {
  return pickBySessionSalt(REPEAT_PROMPT_OPTIONS)
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
          if (gameData.currentIteration === 1) return 'The Fortune Teller is sensing your first thread...'
          if (gameData.currentIteration === 2 && priorLabel) {
            return `We've spoken of ${priorLabel.toLowerCase()}… now another path calls.`
          }
          return 'One final thread remains. Listen closely...'
        }
        if (isFortuneTeller) return ''
        return 'Waiting for the Fortune Teller...'
      }
      if (isGuest) return 'The oracle is asking what you wish to know — a moment...'
      return 'The oracle is turning toward the guest...'
    case 'guest_chooses_category':
      if (isGuest) return ''
      return 'Waiting for the guest to choose a theme...'
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
        position: { top: 0, left: 0 }
      }}
    >
      <UiEntity uiTransform={{ width: '100%', height: '10%' }} uiBackground={{ color: barColor }} />
      <UiEntity uiTransform={{ width: '100%', height: '10%' }} uiBackground={{ color: barColor }} />
    </UiEntity>
  )
}

function uiComponent() {
  const fortune = gameData.currentFortune
  const phase = gameData.revelationPhase
  const isVisible =
    SHOW_UI_FORTUNE &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    !!fortune &&
    phase === 'fortune_display'

  const player = getPlayer()
  const isFortuneTeller =
    !!player && gameData.currentFortuneTellerId !== null && gameData.currentFortuneTellerId === player.userId
  const isGuest = !!player && gameData.currentGuestId !== null && gameData.currentGuestId === player.userId
  const hasHumanFortuneTeller = gameData.currentFortuneTellerId !== null
  const showFtInvite =
    SHOW_UI_FORTUNE &&
    gameData.gameState === 'OCUPADO' &&
    phase === 'ft_asks_topic' &&
    isFortuneTeller

  const showGuestCategories =
    SHOW_UI_FORTUNE &&
    gameData.gameState === 'OCUPADO' &&
    phase === 'guest_chooses_category' &&
    isGuest

  const showFtKinds =
    SHOW_UI_FORTUNE &&
    gameData.gameState === 'OCUPADO' &&
    phase === 'ft_chooses_kind' &&
    isFortuneTeller

  const guestCategoryOptions =
    gameData.gameState === 'OCUPADO' && phase === 'guest_chooses_category' && gameData.currentGuestId
      ? pickThreeGuestCategoriesSeeded(gameData.currentGuestId, gameData.revelationRoundSalt)
      : null
  const guestCategoryAvailableOptions = guestCategoryOptions
    ? guestCategoryOptions.filter((cat) => !gameData.previouslySelectedCategories.includes(cat))
    : null

  const activeOwnsInteraction =
    (isFortuneTeller && (phase === 'ft_asks_topic' || phase === 'ft_chooses_kind')) ||
    (isGuest && phase === 'guest_chooses_category') ||
    (isGuest && phase === 'guest_learn_more')

  const showWaitingPanel =
    SHOW_UI_FORTUNE && gameData.gameState === 'OCUPADO' && !activeOwnsInteraction

  const showGuestLearnMore =
    SHOW_UI_FORTUNE &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    phase === 'guest_learn_more' &&
    isGuest

  const showFortuneTellerLearnMorePrompt =
    SHOW_UI_FORTUNE &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    phase === 'guest_learn_more' &&
    isFortuneTeller &&
    hasHumanFortuneTeller

  const showSpectatorLearnMoreWait =
    SHOW_UI_FORTUNE &&
    gameData.gameState === 'MOSTRANDO_FORTUNA' &&
    phase === 'guest_learn_more' &&
    !isGuest &&
    !isFortuneTeller

  const showFarewellMaxReadings =
    SHOW_UI_FORTUNE &&
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
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch'
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
              width: '25%',
              height: '50%',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{
                width: '80%',
                height: '70%',
                margin: { top: '5%' }
              }}
              value={waitingFortuneLine}
              textAlign="middle-center"
              fontSize={22}
              font="serif"
              color={Color4.create(1, 1, 1, waitingAlpha)}
            />
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
              width: '25%',
              height: '50%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{
                width: '80%',
                height: '12%'
              }}
              value={kindLabel ? `${capitalizedCategory} · ${kindLabel}` : capitalizedCategory}
              textAlign="bottom-center"
              fontSize={18}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />

            <Label
              uiTransform={{
                width: '60%',
                height: '50%'
              }}
              value={fortuneText}
              textAlign="top-center"
              fontSize={22}
              font="serif"
            />
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
              width: '28%',
              height: '50%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{ width: '88%', height: '70%' }}
              value={maxReadingsFarewellLine}
              textAlign="middle-center"
              fontSize={20}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />
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
              width: '30%',
              height: '50%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{ width: '88%', height: '22%' }}
              value={repeatPrompt}
              textAlign="middle-center"
              fontSize={18}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />
            <Label
              uiTransform={{ width: '86%', height: '20%', margin: { top: 8 } }}
              value="Ask the guest. They will choose Yes or No."
              textAlign="middle-center"
              fontSize={15}
              font="serif"
            />
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
              width: '28%',
              height: '45%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{ width: '85%', height: '55%' }}
              value="The guest decides whether to hear another reading..."
              textAlign="middle-center"
              fontSize={18}
              font="serif"
            />
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
              width: '30%',
              height: '55%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{ width: '90%', height: '18%' }}
              value={repeatPrompt}
              textAlign="middle-center"
              fontSize={18}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />
            <UiEntity
              uiTransform={{
                width: '72%',
                height: '14%',
                margin: { top: 16 },
                flexDirection: 'row',
                justifyContent: 'space-between',
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
                  fontSize={16}
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
                  fontSize={16}
                  font="serif"
                />
              </UiEntity>
            </UiEntity>
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
              width: '30%',
              height: '50%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{ width: '88%', height: '28%' }}
              value={hostTopicPrompt()}
              textAlign="middle-center"
              fontSize={17}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />
            <UiEntity
              uiTransform={{ width: '70%', height: '18%', margin: { top: 12 } }}
              uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
              onMouseDown={() => fortuneTellerInviteGuestToChooseTopic()}
            >
              <Label
                uiTransform={{ width: '100%', height: '100%' }}
                value="Continue"
                textAlign="middle-center"
                fontSize={16}
                font="serif"
              />
            </UiEntity>
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
              width: '30%',
              height: '60%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{ width: '90%', height: '12%' }}
              value={guestThemePrompt()}
              textAlign="middle-center"
              fontSize={18}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />
            <UiEntity
              uiTransform={{
                width: '60%',
                height: '35%',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'stretch',
                margin: { top: 8 }
              }}
            >
              {guestCategoryAvailableOptions.map((cat, index) => (
                <UiEntity
                  key={cat}
                  uiTransform={{
                    width: '30%',
                    height: '60%'
                  }}
                  uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                  onMouseDown={() => guestSubmitChosenCategory(cat)}
                >
                  <Label
                    uiTransform={{ width: '100%', height: '100%' }}
                    value={`${index + 1}\n${CATEGORY_LABELS[cat]}`}
                    textAlign="middle-center"
                    fontSize={14}
                    font="serif"
                  />
                </UiEntity>
              ))}
            </UiEntity>
            {gameData.categoryRejectionLine !== null && (
              <Label
                uiTransform={{ width: '92%', height: '16%', margin: { top: 8 } }}
                value={gameData.categoryRejectionLine}
                textAlign="middle-center"
                fontSize={14}
                font="serif"
                color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
              />
            )}
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
              width: '30%',
              height: '60%',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: CARD_UI_VERTICAL_OFFSET }
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{ width: '90%', height: '14%' }}
              value="Choose the tone of the reading:"
              textAlign="middle-center"
              fontSize={17}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />
            <UiEntity
              uiTransform={{
                width: '70%',
                height: '38%',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                margin: { top: 10 }
              }}
            >
              {KIND_ORDER.map((kind) => (
                <UiEntity
                  key={kind}
                  uiTransform={{ width: '100%', height: '28%' }}
                  uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                  onMouseDown={() => fortuneTellerSubmitKind(kind)}
                >
                  <Label
                    uiTransform={{ width: '100%', height: '100%' }}
                    value={KIND_LABELS[kind]}
                    textAlign="middle-center"
                    fontSize={15}
                    font="serif"
                  />
                </UiEntity>
              ))}
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

      {cinematicBarAlpha > 0 && <CinematicLetterbox alpha={cinematicBarAlpha} />}
    </UiEntity>
  )
}
