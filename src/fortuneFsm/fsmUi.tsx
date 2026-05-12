import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from '../gameState'
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
import type { FortuneCategory } from '../types'
import { FSM_CATEGORY_LABELS, getFsmCategoryOffer } from './categories'
import { getFsmRevealFortuneText, getFsmRevealKindTitle } from './resolveRevealFortune'
import { fsmSession } from './session'
import type { FsmCardChoice, FsmDeck } from './types'
import {
  CARD_VERTICAL_OFFSET,
  CARD_BG,
  CARD_CONTENT_HEIGHT,
  CARD_CONTENT_LAYER,
  CARD_ROOT_COLUMN,
  getCardSize
} from '../cardLayout'
import { CenteredLabelRow } from '../centeredLabelRow'

const TAROT_BACK = 'assets/images/tarot_back_01.png'
/** Fondo de los botones de categoría (Love, Money, Luck, …) en CATEGORY_SELECTION. */
const CATEGORY_BTN_BG = {
  texture: { src: 'assets/images/button.png' },
  textureMode: CARD_BG.textureMode
}
const SESSION_FINISHED_FADE_MS = 500

/**
 * Altura igual que CARD_CONTENT_HEIGHT compartido (referencia para maxHeight % del cuerpo).
 * paddingTop: 10px para separar ligeramente el título del borde de la carta.
 */
const REVEAL_INNER_COLUMN = {
  width: '100%' as const,
  height: CARD_CONTENT_HEIGHT,
  flexDirection: 'column' as const,
  justifyContent: 'flex-start' as const,
  alignItems: 'center' as const,
  padding: { top: 10, left: 0, right: 0, bottom: 0 } as const,
  margin: { top: 0 } as const
}
const REVEAL_TIGHT_STACK = {
  width: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'flex-start' as const,
  alignItems: 'stretch' as const
}
/** Una fila de controles (ej. A/B/C o Sí/No): un solo elemento en el eje Y del root. */
const CARD_CONTROL_ROW = {
  width: '100%' as const,
  flexDirection: 'row' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const
}
const BTN_ROW_HEIGHT = 64
const BTN = { color: Color4.create(0.15, 0.12, 0.05, 0.9) }
const BTN_YES = Color4.create(0.15, 0.45, 0.15, 1)
const BTN_NO = Color4.create(0.45, 0.1, 0.1, 1)
const YES_NO_BUTTON_HEIGHT = 48
const BUTTON_BORDER_RADIUS = 12
const GOLD = Color4.create(212 / 255, 175 / 255, 55 / 255, 1)
const WHITE = Color4.create(1, 1, 1, 1)
const CARD_WHITE = Color4.create(0.95, 0.95, 0.95, 1)

/** Tamaño único de fuente para todo el texto sobre card.png en el flujo FSM (host, guest, revelación, botones). */
const CARD_UI_FONT_SIZE = 22
/** Misma caja de texto para "Reading starts…" y mensaje de sesión terminada (mismo font + misma altura de fila). */
const CARD_READING_BOOKEND_ROW_HEIGHT = 120
/** Punto de arranque vertical común para todo el contenido del FSM sobre card.png. */
const CARD_CONTENT_START_OFFSET = 200

const CARD_TEXT_ALIGN: 'middle-center' = 'middle-center'
const CARD_LABEL_TEXT_ALIGN: 'top-center' = 'top-center'

/** Pregunta fija en CONTINUE_DECISION (invitado + host); el legacy sigue usando `repeatFortunePrompt.ts`. */
const FSM_CONTINUE_PROMPT = 'Do you want another reading?'
/** Altura de fila acorde a {@link CARD_UI_FONT_SIZE} (una línea de pregunta antes de Sí/No / texto host). */
const FSM_CONTINUE_PROMPT_ROW_HEIGHT = 52

const DECKS: FsmDeck[] = ['Funny', 'Serious', 'Strange']
const CARD_SLOTS: { key: FsmCardChoice; idx: 0 | 1 | 2 }[] = [
  { key: 'A', idx: 0 },
  { key: 'B', idx: 1 },
  { key: 'C', idx: 2 }
]

/**
 * Contenido de la revelación (sin card.png): host/invitado lo incrustan en su mismo {@link HostCardShell}
 * para no desmontar la textura al pasar de FORTUNE_SELECTION a REVEAL.
 */
function RevealFortuneCardContent() {
  const name = fsmSession.guestName?.trim() || 'Guest'
  const choice = fsmSession.selectedFortune
  const kindTitle = getFsmRevealKindTitle(choice)
  const body = getFsmRevealFortuneText(fsmSession)
  const fortuneText = `${name}, ${body}`

  /**
   * Misma jerarquía que ui.tsx cuando `isVisible` (fortuna legacy): REVEAL_INNER_COLUMN da altura % fija
   * para que el Label del cuerpo con maxHeight: '68%' no quede en 0 px.
   */
  return (
    <UiEntity uiTransform={{ ...REVEAL_INNER_COLUMN }}>
      <UiEntity uiTransform={{ ...REVEAL_TIGHT_STACK }}>
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
            value={kindTitle || '—'}
            textAlign="middle-center"
            textWrap="wrap"
            fontSize={CARD_UI_FONT_SIZE}
            font="serif"
            color={GOLD}
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
          fontSize={CARD_UI_FONT_SIZE}
          font="serif"
          color={Color4.create(0.95, 0.95, 0.95, 1)}
        />
      </UiEntity>
    </UiEntity>
  )
}

/** Espectadores (y cualquier rol sin panel propio en REVEAL): carta + contenido. */
function RevealFortuneOnCard() {
  return (
    <HostCardShell>
      <RevealFortuneCardContent />
    </HostCardShell>
  )
}

/**
 * Despedida / "Your reading is finished" sobre card.png (misma secuencia que el flujo en carta;
 * evita superponerse al InfoBanner / otros diálogos del mundo).
 */
function SessionFinishedOnCard({ uid }: { uid: string | null }) {
  const msg = fsmSession.sessionFinishedMessage
  if (!msg || msg.length === 0) return null

  const expires = fsmSession.sessionFinishedExpiresAtMs
  const now = Date.now()
  let alpha = 1
  if (expires != null) {
    const remaining = expires - now
    if (remaining <= 0) return null
    if (remaining < SESSION_FINISHED_FADE_MS) {
      alpha = remaining / SESSION_FINISHED_FADE_MS
    }
  }

  const textColor = Color4.create(0.95, 0.95, 0.95, alpha)
  const inner = (
    <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN} value={msg} fontSize={CARD_UI_FONT_SIZE} color={textColor} height={CARD_READING_BOOKEND_ROW_HEIGHT} />
  )
  if (uid !== null && uid === fsmSession.guestId) {
    return <GuestCardShell contentAlpha={alpha}>{inner}</GuestCardShell>
  }
  return <HostCardShell contentAlpha={alpha}>{inner}</HostCardShell>
}

/** Espectadores: misma idea que `showSpectatorLearnMoreWait` en ui.tsx legacy. */
function SpectatorContinueWaitPanel() {
  return (
    <HostCardShell>
      <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
        value="The guest decides whether to hear another reading..."
        fontSize={CARD_UI_FONT_SIZE}
        color={Color4.create(0.95, 0.95, 0.95, 1)}
        height={120}
      />
    </HostCardShell>
  )
}

function HostCardShell(props: { children?: any; contentJustify?: 'center' | 'flex-start'; contentAlpha?: number }) {
  const justify = props.contentJustify ?? 'flex-start'
  const a = props.contentAlpha ?? 1
  const cardBg =
    a >= 1
      ? CARD_BG
      : {
          texture: CARD_BG.texture,
          textureMode: CARD_BG.textureMode,
          color: Color4.create(1, 1, 1, a)
        }
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
          ...getCardSize(),
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          margin: { top: CARD_VERTICAL_OFFSET },
          positionType: 'relative',
          overflow: 'visible'
        }}
        uiBackground={cardBg}
      >
        <UiEntity
          uiTransform={{
            ...CARD_CONTENT_LAYER,
            justifyContent: justify,
            margin: { top: CARD_CONTENT_START_OFFSET }
          }}
        >
          <UiEntity uiTransform={{ ...CARD_ROOT_COLUMN, justifyContent: justify }}>
            {props.children}
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

function GuestCardShell(props: { children?: any; contentJustify?: 'center' | 'flex-start'; contentAlpha?: number }) {
  return (
    <HostCardShell contentJustify={props.contentJustify} contentAlpha={props.contentAlpha}>
      {props.children}
    </HostCardShell>
  )
}

function HostPanel() {
  const st = fsmSession.state
  const cat = fsmSession.selectedCategory

  if (st === 'INIT') {
    return (
      <HostCardShell>
        {/* FIX: CenteredLabelRow garantiza width:100% con altura fija → textAlign middle-center funciona */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN} value="Ask the Guest:" fontSize={CARD_UI_FONT_SIZE} color={GOLD} height={52} />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 16 } }}>
          <UiEntity
            uiTransform={{ width: '72%', height: 52 }}
            uiBackground={BTN}
            onMouseDown={() => hostOpenCategorySelection()}
          >
            <Label
              uiTransform={{ width: '100%', height: '100%' }}
              value="What do you want to know?"
              textAlign={CARD_TEXT_ALIGN}
              fontSize={CARD_UI_FONT_SIZE}
              font="serif"
              color={CARD_WHITE}
            />
          </UiEntity>
        </UiEntity>
      </HostCardShell>
    )
  }

  if (st === 'CATEGORY_SELECTION') {
    return (
      <HostCardShell>
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value="The Guest is choosing a focus for the reading."
          fontSize={CARD_UI_FONT_SIZE}
          color={Color4.create(0.95, 0.95, 0.95, 1)}
          height={120}
        />
      </HostCardShell>
    )
  }

  if (st === 'DECK_SELECTION' && cat) {
    return (
      <HostCardShell>
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN} value="Fortune Teller clicks one deck" fontSize={CARD_UI_FONT_SIZE} color={GOLD} height={56} />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 18 }, height: BTN_ROW_HEIGHT }}>
          {DECKS.map((d, i) => (
            <UiEntity
              key={d}
              uiTransform={{ width: '29%', height: '100%', margin: { left: i === 0 ? 0 : 10 } }}
              uiBackground={BTN}
              onMouseDown={() => hostPickDeck(d)}
            >
              <Label
                uiTransform={{ width: '100%', height: '100%' }}
                value={d}
                textAlign={CARD_TEXT_ALIGN}
                fontSize={CARD_UI_FONT_SIZE}
                font="serif"
                color={GOLD}
              />
            </UiEntity>
          ))}
        </UiEntity>
      </HostCardShell>
    )
  }

  if (st === 'CARD_SELECTION') {
    return (
      <HostCardShell>
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value="Guest will pick a card."
          fontSize={CARD_UI_FONT_SIZE}
          color={Color4.create(0.95, 0.95, 0.95, 1)}
          height={80}
        />
      </HostCardShell>
    )
  }

  if (st === 'FORTUNE_SELECTION' && fsmSession.selectedCardType) {
    return (
      <HostCardShell>
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value={`Guest chose card ${fsmSession.selectedCardType}. Fortune Teller, pick a meaning:`}
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={88}
        />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 20 }, height: BTN_ROW_HEIGHT }}>
          {(
            [
              { choice: 'A' as const, label: 'Prediction' },
              { choice: 'B' as const, label: 'Advice' },
              { choice: 'C' as const, label: 'Warning' }
            ] as const
          ).map(({ choice, label }, i) => (
            <UiEntity
              key={choice}
              uiTransform={{ width: '29%', height: '100%', margin: { left: i === 0 ? 0 : 10 } }}
              uiBackground={BTN}
              onMouseDown={() => hostPickFortune(choice)}
            >
              <Label
                uiTransform={{ width: '100%', height: '100%' }}
                value={label}
                textAlign={CARD_TEXT_ALIGN}
                fontSize={CARD_UI_FONT_SIZE}
                font="serif"
                color={GOLD}
              />
            </UiEntity>
          ))}
        </UiEntity>
      </HostCardShell>
    )
  }

  if (st === 'REVEAL') {
    return (
      <HostCardShell>
        <RevealFortuneCardContent />
      </HostCardShell>
    )
  }

  if (st === 'CONTINUE_DECISION') {
    return (
      <HostCardShell>
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN} value={FSM_CONTINUE_PROMPT} fontSize={CARD_UI_FONT_SIZE} color={CARD_WHITE} height={FSM_CONTINUE_PROMPT_ROW_HEIGHT} />
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value="Ask the guest. They will choose Yes or No."
          fontSize={CARD_UI_FONT_SIZE}
          color={CARD_WHITE}
          height={72}
        />
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
        {/* FIX: antes height:'auto' colapsaba el ancho → texto no centraba en X */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value="Reading starts…"
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={CARD_READING_BOOKEND_ROW_HEIGHT}
        />
      </GuestCardShell>
    )
  }

  if (st === 'CATEGORY_SELECTION') {
    const offer = getFsmCategoryOffer(fsmSession.guestId, fsmSession.usedCategories)
    const btnWidth = offer.length === 1 ? '72%' : offer.length === 2 ? '44%' : '29%'
    return (
      <GuestCardShell>
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN} value="What do you want to know?" fontSize={CARD_UI_FONT_SIZE} color={CARD_WHITE} height={52} />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 20 }, height: BTN_ROW_HEIGHT }}>
          {offer.map((cat: FortuneCategory, i: number) => (
            <UiEntity
              key={cat}
              uiTransform={{ width: btnWidth, height: '100%', margin: { left: i === 0 ? 0 : 8 } }}
              uiBackground={CATEGORY_BTN_BG}
              onMouseDown={() => guestPickCategory(cat)}
            >
              <Label
                uiTransform={{ width: '100%', height: '100%' }}
                value={FSM_CATEGORY_LABELS[cat]}
                textAlign={CARD_TEXT_ALIGN}
                fontSize={CARD_UI_FONT_SIZE}
                font="serif"
                color={Color4.White()}
              />
            </UiEntity>
          ))}
        </UiEntity>
      </GuestCardShell>
    )
  }

  if (st === 'DECK_SELECTION') {
    const topic = fsmSession.selectedCategory
    return (
      <GuestCardShell>
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value={
            topic
              ? `The Fortune Teller is choosing the deck…`
              : 'The Fortune Teller is choosing the deck…'
          }
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={100}
        />
      </GuestCardShell>
    )
  }

  if (st === 'CARD_SELECTION') {
    return (
      <GuestCardShell>
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN} value="Choose a card." fontSize={CARD_UI_FONT_SIZE} color={CARD_WHITE} height={48} marginBottom={12} />
        <UiEntity
          uiTransform={{
            ...CARD_CONTROL_ROW,
            height: 120,
            maxWidth: '100%'
          }}
        >
          {CARD_SLOTS.map(({ key, idx }, i) => {
            const flipped = fsmSession.cardFlipIndex === idx
            return (
              <UiEntity
                key={key}
                uiTransform={{
                  width: '30%',
                  height: '100%',
                  margin: { left: i === 0 ? 0 : 12 },
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                uiBackground={{ texture: { src: TAROT_BACK }, textureMode: 'stretch' }}
                onMouseDown={() => guestPickCard(key, idx)}
              >
                {flipped && (
                  <Label
                    uiTransform={{ width: '100%', height: '100%' }}
                    value={key}
                    textAlign={CARD_TEXT_ALIGN}
                    fontSize={CARD_UI_FONT_SIZE}
                    font="serif"
                    color={Color4.create(1, 1, 1, 0.9)}
                  />
                )}
              </UiEntity>
            )
          })}
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
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value={hint}
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={80}
        />
      </GuestCardShell>
    )
  }

  if (st === 'REVEAL') {
    return (
      <GuestCardShell>
        <RevealFortuneCardContent />
      </GuestCardShell>
    )
  }

  if (st === 'CONTINUE_DECISION') {
    return (
      <GuestCardShell>
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value={FSM_CONTINUE_PROMPT}
          fontSize={CARD_UI_FONT_SIZE}
          color={CARD_WHITE}
          height={FSM_CONTINUE_PROMPT_ROW_HEIGHT}
        />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 8 }, height: YES_NO_BUTTON_HEIGHT }}>
          <UiEntity
            uiTransform={{ width: '44%', height: '100%', margin: { right: 12 }, borderRadius: BUTTON_BORDER_RADIUS }}
            uiBackground={{ color: BTN_YES }}
            onMouseDown={() => guestContinueYes()}
          >
            <Label
              uiTransform={{ width: '100%', height: '100%' }}
              value="Yes"
              textAlign={CARD_TEXT_ALIGN}
              fontSize={CARD_UI_FONT_SIZE}
              font="serif"
              color={WHITE}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: '44%', height: '100%', borderRadius: BUTTON_BORDER_RADIUS }}
            uiBackground={{ color: BTN_NO }}
            onMouseDown={() => guestContinueNo()}
          >
            <Label
              uiTransform={{ width: '100%', height: '100%' }}
              value="No"
              textAlign={CARD_TEXT_ALIGN}
              fontSize={CARD_UI_FONT_SIZE}
              font="serif"
              color={WHITE}
            />
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
  /** Host = adivino en sesión; doble chequeo por si hostId del snapshot y gameData desincronizan. */
  const isHost =
    !fsmSession.isVirtualHost &&
    uid !== null &&
    fsmSession.active &&
    uid !== fsmSession.guestId &&
    (uid === fsmSession.hostId || uid === gameData.currentFortuneTellerId)
  const isGuest = uid !== null && uid === fsmSession.guestId

  const showRevealCard = fsmSession.active && fsmSession.state === 'REVEAL'
  const showSessionFinishedOnCard =
    !fsmSession.active &&
    fsmSession.sessionFinishedMessage !== null &&
    fsmSession.sessionFinishedMessage.length > 0

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        zIndex: 12
      }}
    >
      {/*
       * Wrapper absoluto para la carta: siempre empieza en top:0, sin importar
       * que haya o no WorldBanner — así la carta nunca se desplaza verticalmente.
       */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
      >
        {showRevealCard && !isHost && !isGuest && <RevealFortuneOnCard />}
        {fsmSession.active && isHost && <HostPanel />}
        {fsmSession.active && isGuest && <GuestPanel />}
        {fsmSession.active &&
          fsmSession.state === 'CONTINUE_DECISION' &&
          uid !== null &&
          !isHost &&
          !isGuest && <SpectatorContinueWaitPanel />}
        {showSessionFinishedOnCard && <SessionFinishedOnCard uid={uid} />}
      </UiEntity>
    </UiEntity>
  )
}
