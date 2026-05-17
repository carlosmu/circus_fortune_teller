import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { playButtonClick } from './fortuneSync'

type LeaveRoleDialogState = {
  visible: boolean
  role: 'Guest' | 'Fortune Teller'
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

const dialogState: LeaveRoleDialogState = {
  visible: false,
  role: 'Guest',
  onConfirm: null,
  onCancel: null
}

export function showLeaveRoleDialog(
  role: 'Guest' | 'Fortune Teller',
  onConfirm: () => void,
  onCancel: () => void
): void {
  dialogState.visible = true
  dialogState.role = role
  dialogState.onConfirm = onConfirm
  dialogState.onCancel = onCancel
}

export function isLeaveRoleDialogVisible(): boolean {
  return dialogState.visible
}

function handleYes(): void {
  playButtonClick()
  dialogState.visible = false
  const cb = dialogState.onConfirm
  dialogState.onConfirm = null
  dialogState.onCancel = null
  cb?.()
}

function handleNo(): void {
  playButtonClick()
  dialogState.visible = false
  const cb = dialogState.onCancel
  dialogState.onConfirm = null
  dialogState.onCancel = null
  cb?.()
}

const OVERLAY_BG = Color4.create(0, 0, 0, 0.65)
const PANEL_BG = Color4.create(0.08, 0.04, 0.12, 0.96)
const GOLD = Color4.create(212 / 255, 175 / 255, 55 / 255, 1)
const BTN_YES = Color4.create(0.15, 0.45, 0.15, 1)
const BTN_NO = Color4.create(0.45, 0.1, 0.1, 1)
const WHITE = Color4.create(1, 1, 1, 1)
/** Mismo `borderRadius` que el panel interior del `InfoBanner` (`borderRadius: 12`). */
const DIALOG_BORDER_RADIUS = 12
const DIALOG_BUTTON_HEIGHT = 48

export function LeaveRoleDialog() {
  if (!dialogState.visible) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200
      }}
      uiBackground={{ color: OVERLAY_BG }}
    >
      <UiEntity
        uiTransform={{
          width: 500,
          height: 200,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { top: 28, bottom: 28, left: 24, right: 24 },
          borderRadius: DIALOG_BORDER_RADIUS
        }}
        uiBackground={{ color: PANEL_BG }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 76,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            margin: { bottom: 20 }
          }}
        >
          <Label
            uiTransform={{ width: '100%', height: '100%' }}
            value={`Do you want to leave the ${dialogState.role} role?`}
            textAlign="middle-center"
            textWrap="wrap"
            fontSize={20}
            font="serif"
            color={GOLD}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            width: '100%',
            height: 56,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <UiEntity
            uiTransform={{ width: 160, height: DIALOG_BUTTON_HEIGHT, margin: { right: 20 }, borderRadius: DIALOG_BORDER_RADIUS }}
            uiBackground={{ color: BTN_YES }}
            onMouseDown={handleYes}
          >
            <Label
              uiTransform={{ width: '100%', height: '100%' }}
              value="Yes"
              textAlign="middle-center"
              fontSize={20}
              font="serif"
              color={WHITE}
            />
          </UiEntity>

          <UiEntity
            uiTransform={{ width: 160, height: DIALOG_BUTTON_HEIGHT, borderRadius: DIALOG_BORDER_RADIUS }}
            uiBackground={{ color: BTN_NO }}
            onMouseDown={handleNo}
          >
            <Label
              uiTransform={{ width: '100%', height: '100%' }}
              value="No"
              textAlign="middle-center"
              fontSize={20}
              font="serif"
              color={WHITE}
            />
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
