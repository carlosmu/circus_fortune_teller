import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from './gameState'
import { SHOW_UI_FORTUNE } from './sceneConfig'
import { revealFortuneForCategory } from './hostSystem'
import { HostGuestStatusBar } from './hostGuestStatusUi'
import { cinematicBarAlpha } from './cinematicCamera'
import type { FortuneCategory } from './types'

let waitingPanelTime = 0
const WAITING_ALPHA_SPEED = 3

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

function pickThreeRandomCategories(): [FortuneCategory, FortuneCategory, FortuneCategory] {
  const shuffled = [...ALL_CATEGORIES].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1], shuffled[2]]
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
  const isHost =
    !!player && gameData.currentHostId !== null && gameData.currentHostId === player.userId
  const showHostChoice = gameData.gameState === 'OCUPADO' && isHost
  const showWaitingPanel =
    SHOW_UI_FORTUNE && gameData.gameState === 'OCUPADO' && !isHost
  const waitingAlpha = gameData.waitingPanelAlpha

  if (gameData.gameState !== 'OCUPADO') {
    gameData.currentHostChoiceOptions = null
  } else if (showHostChoice && gameData.currentHostChoiceOptions === null) {
    gameData.currentHostChoiceOptions = pickThreeRandomCategories()
  }

  const hostOptions = gameData.currentHostChoiceOptions

  const text = fortune?.text ?? ''
  const category = fortune?.category ?? ''
  const capitalizedCategory =
    category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
  const guestName = gameData.currentGuestName ?? ''
  const fortuneText = guestName ? `${guestName}, ${text}` : text

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
      <HostGuestStatusBar />

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

      {/* Waiting for the host panel (guest view) */}
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
              alignItems: 'center'
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
              value="Your fortune is..."
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
              alignItems: 'center'
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

      {/* Host category choice panel */}
      {showHostChoice && (
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
              alignItems: 'center'
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
              {hostOptions?.map((category, index) => (
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

      {/* Cinematic letterbox bars */}
      {cinematicBarAlpha > 0 && (
        <CinematicLetterbox alpha={cinematicBarAlpha} />
      )}
    </UiEntity>
  )
}