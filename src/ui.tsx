import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { SHOW_UI_FORTUNE } from './sceneConfig'
import { revealFortuneForCategory } from './fortuneTellerSystem'
import { FortuneTellerGuestStatusBar } from './fortuneTellerGuestStatusUi'
import { cinematicBarAlpha } from './cinematicCamera'
import type { FortuneCategory } from './types'

let waitingPanelTime = 0
const WAITING_ALPHA_SPEED = 3
/** Vertical offset (px) applied to all card.png UI panels. Negative moves up. */
const CARD_UI_VERTICAL_OFFSET = '-100px'

const ALL_CATEGORIES: FortuneCategory[] = ['love', 'money', 'health', 'work', 'mystery', 'pets', 'family', 'travel', 'luck']

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
const WAITING_FORTUNE_LINES = [
  'Your fate is...',
  'Your destiny awaits...',
  'The cards have spoken...',
  'What lies ahead is...'
]

function pickThreeRandomCategories(): [FortuneCategory, FortuneCategory, FortuneCategory] {
  const shuffled = [...ALL_CATEGORIES].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1], shuffled[2]]
}

function pickWaitingLine(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return WAITING_FORTUNE_LINES[hash % WAITING_FORTUNE_LINES.length]
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
      {/* Top bar */}
      <UiEntity
        uiTransform={{ width: '100%', height: '10%' }}
        uiBackground={{ color: barColor }}
      />
      {/* Bottom bar */}
      <UiEntity
        uiTransform={{ width: '100%', height: '10%' }}
        uiBackground={{ color: barColor }}
      />
    </UiEntity>
  )
}

function uiComponent() {
  const fortune = gameData.currentFortune
  const isVisible =
    SHOW_UI_FORTUNE && gameData.gameState === 'MOSTRANDO_FORTUNA' && !!fortune

  const player = getPlayer()
  const isFortuneTeller =
    !!player && gameData.currentFortuneTellerId !== null && gameData.currentFortuneTellerId === player.userId
  const showFortuneTellerChoice = gameData.gameState === 'OCUPADO' && isFortuneTeller
  const showWaitingPanel =
    SHOW_UI_FORTUNE && gameData.gameState === 'OCUPADO' && !isFortuneTeller
  const waitingAlpha = gameData.waitingPanelAlpha

  if (gameData.gameState !== 'OCUPADO') {
    gameData.currentFortuneTellerChoiceOptions = null
  } else if (showFortuneTellerChoice && gameData.currentFortuneTellerChoiceOptions === null) {
    gameData.currentFortuneTellerChoiceOptions = pickThreeRandomCategories()
  }

  const fortuneTellerOptions = gameData.currentFortuneTellerChoiceOptions

  const text = fortune?.text ?? ''
  const category = fortune?.category ?? ''
  const capitalizedCategory =
    category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
  const guestName = gameData.currentGuestName ?? ''
  const fortuneText = guestName ? `${guestName}, ${text}` : text
  const waitingSeed = `${gameData.currentGuestId ?? ''}:${gameData.currentGuestName ?? ''}`
  const waitingBaseLine = pickWaitingLine(waitingSeed)
  const waitingFortuneLine = guestName ? `${guestName}, ${waitingBaseLine}` : waitingBaseLine
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

      {/* Debug state (top-left) */}
      <UiEntity
        uiTransform={{
          width: '40%',
          height: '10%',
          margin: { top: '2%', left: '2%' }
        }}
      >
        <Label
          uiTransform={{ width: '100%', height: '100%' }}
          value={`State: ${gameData.gameState === 'LIBRE' ? 'Free' : gameData.gameState === 'OCUPADO' ? 'Occupied' : 'Showing fortune'}`}
          textAlign="top-left"
          fontSize={14}
          font="serif"
        />
      </UiEntity>

      {/* Waiting for the fortune teller panel (guest view) */}
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
              textureMode: 'stretch',
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

      {/* Fortune panel (when visible) */}
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
              textureMode: 'stretch',
            }}
          >
            {/* Categoría (arriba) */}
            <Label
              uiTransform={{
                width: '80%',
                height: '30%'
              }}
              value={capitalizedCategory}
              textAlign="bottom-center"
              fontSize={18}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />

            {/* Texto de la fortuna, precedido por el nombre del invitado si existe */}
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

      {/* Fortune Teller category choice panel */}
      {showFortuneTellerChoice && (
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
              textureMode: 'stretch',
            }}
          >
            <Label
              uiTransform={{ width: '90%', height: '12%' }}
              value="Choose the card:"
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
              {fortuneTellerOptions?.map((category, index) => (
                <UiEntity
                  key={category}
                  uiTransform={{
                    width: '30%',
                    height: '60%',
                  }}
                  uiBackground={{ color: Color4.create(0.15, 0.12, 0.05, 0.9) }}
                  onMouseDown={() => revealFortuneForCategory(category)}
                >
                  <Label
                    uiTransform={{ width: '100%', height: '100%' }}
                    value={`${index + 1}\n${CATEGORY_LABELS[category]}`}
                    textAlign="middle-center"
                    fontSize={14}
                    font="serif"
                  />
                </UiEntity>
              ))}
            </UiEntity>
          </UiEntity>
        </UiEntity>
      )}

      {/* Big centered banner (fortune teller announcements) */}
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

      {/* Cinematic letterbox bars */}
      {cinematicBarAlpha > 0 && (
        <CinematicLetterbox alpha={cinematicBarAlpha} />
      )}
    </UiEntity>
  )
}