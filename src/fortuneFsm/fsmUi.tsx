import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { SHOW_UI_FORTUNE, USE_FORTUNE_FSM_FLOW } from '../sceneConfig'
import {
  guestContinueNo,
  guestContinueYes,
  guestPickCard,
  guestPickCategory,
  hostOpenCategorySelection,
  hostPickDeck,
  hostPickFortune
} from './actions'
import { fsmSession } from './session'
import { FORTUNE_LINE_BY_CHOICE, type FsmCardChoice, type FsmDeck } from './types'

const CARD_OFFSET = '-100px'
const CARD_PANEL = { width: '600px' as const, height: '600px' as const }
const CARD_BG = { texture: { src: 'assets/images/card.png' }, textureMode: 'stretch' as const }
const TAROT_BACK = 'assets/images/tarot_back_01.png'
const INNER = {
  width: '70%' as const,
  height: '86%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  margin: { top: -80 } as const
}
const STACK = {
  width: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'flex-start' as const,
  alignItems: 'stretch' as const
}
const BTN_ROW = {
  width: '100%' as const,
  height: 56,
  margin: { top: 10 } as const,
  flexDirection: 'row' as const,
  justifyContent: 'space-around' as const
}
const BTN = { color: Color4.create(0.15, 0.12, 0.05, 0.9) }
const GOLD = Color4.create(212 / 255, 175 / 255, 55 / 255, 1)

const DECKS: FsmDeck[] = ['Funny', 'Serious', 'Strange']
const CARD_SLOTS: { key: FsmCardChoice; idx: 0 | 1 | 2 }[] = [
  { key: 'A', idx: 0 },
  { key: 'B', idx: 1 },
  { key: 'C', idx: 2 }
]

function revealGlowAlpha(): number {
  return 0.75 + 0.25 * Math.sin(Date.now() / 350)
}

function WorldBanner({ text }: { text: string }) {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '12%',
        positionType: 'absolute',
        position: { top: '8%', left: 0 },
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Label
        uiTransform={{ width: '90%', height: '100%' }}
        value={text}
        textAlign="middle-center"
        textWrap="wrap"
        fontSize={20}
        font="serif"
        color={GOLD}
      />
    </UiEntity>
  )
}

function RevealWorldLine() {
  const name = fsmSession.guestName?.trim() || 'Guest'
  const fortune = fsmSession.selectedFortune
  const line = fortune ? FORTUNE_LINE_BY_CHOICE[fortune] : '…'
  const a = revealGlowAlpha()
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5
      }}
    >
      <Label
        uiTransform={{ width: '88%', height: 'auto', maxHeight: '40%' }}
        value={`${name}, you will… ${line}`}
        textAlign="middle-center"
        textWrap="wrap"
        fontSize={28}
        font="serif"
        color={Color4.create(1, 0.95, 0.85, a)}
      />
    </UiEntity>
  )
}

function GlobalFinished({ text }: { text: string }) {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20
      }}
    >
      <Label
        uiTransform={{ width: '80%', height: 'auto' }}
        value={text}
        textAlign="middle-center"
        textWrap="wrap"
        fontSize={24}
        font="serif"
        color={GOLD}
      />
    </UiEntity>
  )
}

function HostCardShell(props: { children?: any }) {
  return (
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
          ...CARD_PANEL,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          margin: { top: CARD_OFFSET },
          positionType: 'relative'
        }}
        uiBackground={CARD_BG}
      >
        <UiEntity uiTransform={{ ...INNER }}>{props.children}</UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

function GuestCardShell(props: { children?: any }) {
  return <HostCardShell>{props.children}</HostCardShell>
}

function HostPanel() {
  const st = fsmSession.state
  const cat = fsmSession.selectedCategory

  if (st === 'INIT') {
    return (
      <HostCardShell>
        <UiEntity uiTransform={{ ...STACK }}>
          <Label
            uiTransform={{ width: '100%', height: 'auto' }}
            value="Ask the Guest to choose:"
            textAlign="middle-center"
            textWrap="wrap"
            fontSize={20}
            font="serif"
            color={GOLD}
          />
          <UiEntity
            uiTransform={{ width: '50%', height: 52, margin: { top: 16 } }}
            uiBackground={BTN}
            onMouseDown={() => hostOpenCategorySelection()}
          >
            <Label
              uiTransform={{ width: '100%', height: '100%' }}
              value="Category"
              textAlign="middle-center"
              fontSize={18}
              font="serif"
            />
          </UiEntity>
        </UiEntity>
      </HostCardShell>
    )
  }

  if (st === 'CATEGORY_SELECTION') {
    return (
      <HostCardShell>
        <Label
          uiTransform={{ width: '100%', height: '40%' }}
          value="The Guest is choosing a focus for the reading."
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={20}
          font="serif"
          color={Color4.create(0.95, 0.95, 0.95, 1)}
        />
      </HostCardShell>
    )
  }

  if (st === 'DECK_SELECTION' && cat) {
    return (
      <HostCardShell>
        <UiEntity uiTransform={{ ...STACK }}>
          <Label
            uiTransform={{ width: '100%', height: 'auto' }}
            value={`I want to know about ${cat}`}
            textAlign="middle-center"
            textWrap="wrap"
            fontSize={20}
            font="serif"
            color={GOLD}
          />
          <UiEntity uiTransform={{ ...BTN_ROW, margin: { top: 20 }, height: 180, flexDirection: 'column', justifyContent: 'space-between' }}>
            {DECKS.map((d) => (
              <UiEntity
                key={d}
                uiTransform={{ width: '100%', height: 52 }}
                uiBackground={BTN}
                onMouseDown={() => hostPickDeck(d)}
              >
                <Label
                  uiTransform={{ width: '100%', height: '100%' }}
                  value={d}
                  textAlign="middle-center"
                  fontSize={18}
                  font="serif"
                />
              </UiEntity>
            ))}
          </UiEntity>
        </UiEntity>
      </HostCardShell>
    )
  }

  if (st === 'CARD_SELECTION') {
    return (
      <HostCardShell>
        <Label
          uiTransform={{ width: '100%', height: '50%' }}
          value="Guest will pick a card."
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={22}
          font="serif"
          color={Color4.create(0.95, 0.95, 0.95, 1)}
        />
      </HostCardShell>
    )
  }

  if (st === 'FORTUNE_SELECTION' && fsmSession.selectedCardType) {
    return (
      <HostCardShell>
        <UiEntity uiTransform={{ ...STACK }}>
          <Label
            uiTransform={{ width: '100%', height: 'auto' }}
            value={`User selected: ${fsmSession.selectedCardType}`}
            textAlign="middle-center"
            textWrap="wrap"
            fontSize={20}
            font="serif"
            color={GOLD}
          />
          <UiEntity uiTransform={{ ...BTN_ROW, margin: { top: 24 } }}>
            {(['A', 'B', 'C'] as const).map((k) => (
              <UiEntity
                key={k}
                uiTransform={{ width: '30%', height: '100%' }}
                uiBackground={BTN}
                onMouseDown={() => hostPickFortune(k)}
              >
                <Label
                  uiTransform={{ width: '100%', height: '100%' }}
                  value={k}
                  textAlign="middle-center"
                  fontSize={18}
                  font="serif"
                />
              </UiEntity>
            ))}
          </UiEntity>
        </UiEntity>
      </HostCardShell>
    )
  }

  return null
}

function GuestPanel() {
  const st = fsmSession.state

  if (st === 'INIT') {
    return (
      <GuestCardShell>
        <Label
          uiTransform={{ width: '100%', height: '40%' }}
          value="Reading starts…"
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={22}
          font="serif"
          color={Color4.create(0.95, 0.95, 0.95, 1)}
        />
      </GuestCardShell>
    )
  }

  if (st === 'CATEGORY_SELECTION') {
    return (
      <GuestCardShell>
        <UiEntity uiTransform={{ ...STACK }}>
          <Label
            uiTransform={{ width: '100%', height: 'auto' }}
            value="Choose a category for this reading."
            textAlign="middle-center"
            textWrap="wrap"
            fontSize={20}
            font="serif"
            color={GOLD}
          />
          <UiEntity
            uiTransform={{ width: '50%', height: 52, margin: { top: 20 } }}
            uiBackground={BTN}
            onMouseDown={() => guestPickCategory()}
          >
            <Label
              uiTransform={{ width: '100%', height: '100%' }}
              value="Category"
              textAlign="middle-center"
              fontSize={18}
              font="serif"
            />
          </UiEntity>
        </UiEntity>
      </GuestCardShell>
    )
  }

  if (st === 'CARD_SELECTION') {
    return (
      <GuestCardShell>
        <UiEntity uiTransform={{ width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center' }}>
          <Label
            uiTransform={{ width: '100%', height: 'auto', margin: { bottom: 12 } }}
            value="Choose a card."
            textAlign="middle-center"
            fontSize={18}
            font="serif"
            color={GOLD}
          />
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 200,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'stretch'
            }}
          >
            {CARD_SLOTS.map(({ key, idx }) => {
              const flipped = fsmSession.cardFlipIndex === idx
              return (
                <UiEntity
                  key={key}
                  uiTransform={{ width: '31%', height: '100%' }}
                  uiBackground={{ texture: { src: TAROT_BACK }, textureMode: 'stretch' }}
                  onMouseDown={() => guestPickCard(key, idx)}
                >
                  {flipped && (
                    <Label
                      uiTransform={{ width: '100%', height: '100%' }}
                      value={key}
                      textAlign="middle-center"
                      fontSize={28}
                      font="serif"
                      color={Color4.create(1, 1, 1, 0.9)}
                    />
                  )}
                </UiEntity>
              )
            })}
          </UiEntity>
        </UiEntity>
      </GuestCardShell>
    )
  }

  if (st === 'FORTUNE_SELECTION') {
    const hint =
      fsmSession.fortuneGuestHint === 'clear'
        ? 'It is becoming clear…'
        : 'Reading the cards…'
    return (
      <GuestCardShell>
        <Label
          uiTransform={{ width: '100%', height: '50%' }}
          value={hint}
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={22}
          font="serif"
          color={Color4.create(0.95, 0.95, 0.95, 1)}
        />
      </GuestCardShell>
    )
  }

  if (st === 'CONTINUE_DECISION') {
    return (
      <GuestCardShell>
        <UiEntity uiTransform={{ ...STACK }}>
          <Label
            uiTransform={{ width: '100%', height: 'auto' }}
            value="Do you want another reading?"
            textAlign="middle-center"
            textWrap="wrap"
            fontSize={20}
            font="serif"
            color={GOLD}
          />
          <UiEntity uiTransform={{ ...BTN_ROW, margin: { top: 20 } }}>
            <UiEntity uiTransform={{ width: '46%', height: '100%' }} uiBackground={BTN} onMouseDown={() => guestContinueYes()}>
              <Label uiTransform={{ width: '100%', height: '100%' }} value="Yes" textAlign="middle-center" fontSize={18} font="serif" />
            </UiEntity>
            <UiEntity uiTransform={{ width: '46%', height: '100%' }} uiBackground={BTN} onMouseDown={() => guestContinueNo()}>
              <Label uiTransform={{ width: '100%', height: '100%' }} value="No" textAlign="middle-center" fontSize={18} font="serif" />
            </UiEntity>
          </UiEntity>
        </UiEntity>
      </GuestCardShell>
    )
  }

  return null
}

/** Capa UI del flujo FSM (Host / Guest / mundo). */
export function FortuneFsmLayer() {
  if (!USE_FORTUNE_FSM_FLOW || !SHOW_UI_FORTUNE) return null

  const showWorld =
    fsmSession.active || (fsmSession.sessionFinishedMessage !== null && fsmSession.sessionFinishedMessage.length > 0)
  if (!showWorld) return null

  const player = getPlayer()
  const uid = player?.userId ?? null
  const isHost = uid !== null && uid === fsmSession.hostId
  const isGuest = uid !== null && uid === fsmSession.guestId

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        flexDirection: 'column',
        zIndex: 12
      }}
    >
      {fsmSession.worldBanner && fsmSession.state !== 'REVEAL' && <WorldBanner text={fsmSession.worldBanner} />}
      {fsmSession.state === 'REVEAL' && <RevealWorldLine />}
      {fsmSession.sessionFinishedMessage && <GlobalFinished text={fsmSession.sessionFinishedMessage} />}
      {fsmSession.active && isHost && <HostPanel />}
      {fsmSession.active && isGuest && <GuestPanel />}
    </UiEntity>
  )
}
