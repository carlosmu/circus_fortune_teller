import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'
import { FortuneFsmLayer } from './fortuneFsm/fsmUi'
import { FortuneTellerGuestStatusBar } from './fortuneTellerGuestStatusUi'
import { cinematicBarAlpha } from './cinematicCamera'
import { InfoBanner } from './infoBanner'
import { LeaveRoleDialog } from './leaveRoleDialog'
import { WelcomeIntroPanel } from './welcomeIntroPanel'

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

        <WelcomeIntroPanel />
        <FortuneFsmLayer />
        <InfoBanner
          text={showCenterBanner ? gameData.centerBannerText : null}
          expiresAtMs={gameData.centerBannerUntilMs}
          variant={gameData.centerBannerVariant}
        />
        <FortuneTellerGuestStatusBar />
      </UiEntity>
      <LeaveRoleDialog />
    </UiEntity>
  )
}
