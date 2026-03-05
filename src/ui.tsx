import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}

function uiComponent() {
  const fortune = gameData.currentFortune
  const isVisible = gameData.gameState === 'MOSTRANDO_FORTUNA' && !!fortune

  const text = fortune?.text ?? ''
  const category = fortune?.category ?? ''
  const capitalizedCategory =
    category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
  

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
        />
      </UiEntity>

      {/* Panel de fortuna centrado, solo cuando corresponde */}
      {isVisible && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
        >
          <UiEntity
            uiTransform={{
              width: '30%',
              height: '20%',
              flexDirection: 'column',
              // justifyContent: 'space-between',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            uiBackground={{
              color: Color4.create(0, 0, 0, 0.95)
            }}
          >
            <Label
              uiTransform={{
                width: '90%',
                height: '70%'
              }}
              value={`${capitalizedCategory}: \n${text}`}
              textAlign="middle-center"
              fontSize={24}
            />

          </UiEntity>
        </UiEntity>
      )}
    </UiEntity>
  )
}