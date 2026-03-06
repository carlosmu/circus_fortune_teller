import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { gameData } from './gameState'
import { SHOW_UI_FORTUNE } from './sceneConfig'
import { Color4 } from '@dcl/sdk/math'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}

function uiComponent() {
  const fortune = gameData.currentFortune
  const isVisible =
    SHOW_UI_FORTUNE && gameData.gameState === 'MOSTRANDO_FORTUNA' && !!fortune

  const text = fortune?.text ?? ''
  const category = fortune?.category ?? ''
  const capitalizedCategory =
    category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
  const guestName = gameData.currentGuestName ?? ''

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
      {/* Pequeño debug de estado en la esquina superior izquierda */}
      <UiEntity
        uiTransform={{
          width: '40%',
          height: '10%',
          margin: { top: '2%', left: '2%' }
        }}
      >
        <Label
          uiTransform={{ width: '100%', height: '100%' }}
          value={`Estado: ${gameData.gameState}`}
          textAlign="top-left"
          fontSize={14}
          font="serif"
        />
      </UiEntity>

      {/* Panel de fortuna centrado, solo cuando corresponde */}
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
              // justifyContent: 'space-between',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            uiBackground={{
              texture: { src: 'assets/images/card.png' },
              textureMode: 'stretch'
            }}
          >
            <Label
              uiTransform={{
                width: '80%',
                height: '50%'
              }}
              value={`${guestName ? guestName + '\n' : ''}- ${capitalizedCategory} -`}
              textAlign="bottom-center"
              fontSize={18}
              font="serif"
              color={Color4.create(212 / 255, 175 / 255, 55 / 255, 1)}
            />
            <Label
              uiTransform={{
                width: '80%',
                height: '50%'
              }}
              value={`${text}`}
              textAlign="top-center"
              fontSize={24}
              font="serif"
            />

          </UiEntity>
        </UiEntity>
      )}
    </UiEntity>
  )
}