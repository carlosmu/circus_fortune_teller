import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'
import { FortuneFsmLayer } from './fortuneFsm/fsmUi'
import { FortuneTellerGuestStatusBar } from './fortuneTellerGuestStatusUi'
import { cinematicBarAlpha } from './cinematicCamera'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
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

function uiComponent() {
  const phase = gameData.revelationPhase
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

        {showCenterBanner && (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              positionType: 'absolute',
              position: { top: 0, left: 0 },
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              zIndex: 15
            }}
          >
            <UiEntity
              uiTransform={{
                width: '100%',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: { top: 12, bottom: 20, left: 8, right: 8 }
              }}
            >
              <Label
                uiTransform={{ width: '92%', height: 'auto', minHeight: 28 }}
                value={gameData.centerBannerText ?? ''}
                textAlign="middle-center"
                textWrap="wrap"
                fontSize={20}
                font="serif"
                color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
              />
            </UiEntity>
          </UiEntity>
        )}

        <FortuneFsmLayer />
      </UiEntity>
    </UiEntity>
  )
}
