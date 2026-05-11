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
  CARD_SIZE,
  CARD_BG,
  CARD_CONTENT_HEIGHT,
  CARD_CONTENT_VERTICAL_ADJUST
} from '../cardLayout'
import { InfoBanner } from '../infoBanner'

const TAROT_BACK = 'assets/images/tarot_back_01.png'

/**
 * Área útil sobre card.png: en X solo un hijo directo → {@link CARD_ROOT_COLUMN}.
 * margin.top alinea el contenido con el centro óptico igual que en el sistema legacy (ui.tsx).
 */
const CARD_CONTENT_LAYER = {
  positionType: 'absolute' as const,
  position: { top: 0, left: 0 } as const,
  width: '100%' as const,
  height: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  margin: { top: CARD_CONTENT_VERTICAL_ADJUST } as const,
  overflow: 'visible' as const
}
/**
 * Único hijo de CARD_CONTENT_LAYER: apila bloques en Y. alignItems stretch para que cada Label
 * con width 100% ocupe todo el ancho y textAlign middle-center se aplique al rectángulo completo.
 * height 100%: si es 'auto', hijos con maxHeight en % (p. ej. revelación) colapsan a altura 0 en Yoga.
 */
const CARD_ROOT_COLUMN = {
  width: '75%' as const,
  height: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'stretch' as const
}

/**
 * Altura igual que CARD_CONTENT_HEIGHT compartido (referencia para maxHeight % del cuerpo).
 * paddingTop: 10px para separar ligeramente el título del borde de la carta.
 */
const REVEAL_INNER_COLUMN = {
  width: '100%' as const,
  height: CARD_CONTENT_HEIGHT,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
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
const BTN_ROW_HEIGHT = 56
const BTN = { color: Color4.create(0.15, 0.12, 0.05, 0.9) }
const GOLD = Color4.create(212 / 255, 175 / 255, 55 / 255, 1)

const CARD_TEXT_ALIGN: 'middle-center' = 'middle-center'

/** Pregunta fija en CONTINUE_DECISION (invitado + host); el legacy sigue usando `repeatFortunePrompt.ts`. */
const FSM_CONTINUE_PROMPT = 'Do you want another reading?'
/** Una línea ~font 20: evita hueco grande bajo la pregunta antes de botones / texto host. */
const FSM_CONTINUE_PROMPT_ROW_HEIGHT = 44

/**
 * Wrapper para Labels "sueltos" que necesitan centrarse en X.
 * Yoga/DCL SDK colapsa el ancho del Label cuando height es 'auto';
 * este UiEntity fuerza width:100% con tamaño fijo y hace el centrado via flexbox.
 */
function CenteredLabelRow({
  value,
  fontSize,
  color,
  height = 80,
  marginTop = 0,
  marginBottom = 0
}: {
  value: string
  fontSize: number
  color: Color4
  height?: number
  marginTop?: number
  marginBottom?: number
}) {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height,
        minHeight: height,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        margin: { top: marginTop, bottom: marginBottom }
      }}
    >
      <Label
        uiTransform={{ width: '100%', height: '100%' }}
        value={value}
        textAlign={CARD_TEXT_ALIGN}
        textWrap="wrap"
        fontSize={fontSize}
        font="serif"
        color={color}
      />
    </UiEntity>
  )
}

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
            fontSize={18}
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
          fontSize={22}
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

/** Espectadores: misma idea que `showSpectatorLearnMoreWait` en ui.tsx legacy. */
function SpectatorContinueWaitPanel() {
  return (
    <HostCardShell>
      <CenteredLabelRow
        value="The guest decides whether to hear another reading..."
        fontSize={18}
        color={Color4.create(0.95, 0.95, 0.95, 1)}
        height={120}
      />
    </HostCardShell>
  )
}

function HostCardShell(props: { children?: any; contentJustify?: 'center' | 'flex-start' }) {
  const justify = props.contentJustify ?? 'center'
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
          ...CARD_SIZE,
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          margin: { top: CARD_VERTICAL_OFFSET },
          positionType: 'relative',
          overflow: 'visible'
        }}
        uiBackground={CARD_BG}
      >
        <UiEntity uiTransform={{ ...CARD_CONTENT_LAYER, justifyContent: justify }}>
          <UiEntity uiTransform={{ ...CARD_ROOT_COLUMN, justifyContent: justify }}>
            {props.children}
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

function GuestCardShell(props: { children?: any; contentJustify?: 'center' | 'flex-start' }) {
  return <HostCardShell contentJustify={props.contentJustify}>{props.children}</HostCardShell>
}

function HostPanel() {
  const st = fsmSession.state
  const cat = fsmSession.selectedCategory

  if (st === 'INIT') {
    return (
      <HostCardShell>
        {/* FIX: CenteredLabelRow garantiza width:100% con altura fija → textAlign middle-center funciona */}
        <CenteredLabelRow value="Ask the Guest:" fontSize={20} color={GOLD} height={40} />
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
        {/* FIX */}
        <CenteredLabelRow
          value="The Guest is choosing a focus for the reading."
          fontSize={20}
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
        <CenteredLabelRow value="Fortune Teller clicks one deck" fontSize={20} color={GOLD} height={56} />
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
                fontSize={16}
                font="serif"
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
        <CenteredLabelRow
          value="Guest will pick a card."
          fontSize={22}
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
        <CenteredLabelRow
          value={`Guest chose card ${fsmSession.selectedCardType}. Fortune Teller, pick a meaning:`}
          fontSize={20}
          color={GOLD}
          height={56}
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
                fontSize={16}
                font="serif"
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
        <CenteredLabelRow value={FSM_CONTINUE_PROMPT} fontSize={20} color={GOLD} height={FSM_CONTINUE_PROMPT_ROW_HEIGHT} />
        <CenteredLabelRow
          value="Ask the guest. They will choose Yes or No."
          fontSize={18}
          color={Color4.create(0.95, 0.95, 0.95, 1)}
          height={56}
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
        <CenteredLabelRow
          value="Reading starts…"
          fontSize={22}
          color={Color4.create(0.95, 0.95, 0.95, 1)}
          height={80}
        />
      </GuestCardShell>
    )
  }

  if (st === 'CATEGORY_SELECTION') {
    const offer = getFsmCategoryOffer(fsmSession.guestId, fsmSession.usedCategories)
    const btnWidth = offer.length === 1 ? '72%' : offer.length === 2 ? '44%' : '29%'
    const fontSz = offer.length >= 3 ? 14 : 16
    return (
      <GuestCardShell>
        {/* FIX */}
        <CenteredLabelRow value="What do you want to know?" fontSize={20} color={GOLD} height={44} />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 20 }, height: BTN_ROW_HEIGHT }}>
          {offer.map((cat: FortuneCategory, i: number) => (
            <UiEntity
              key={cat}
              uiTransform={{ width: btnWidth, height: '100%', margin: { left: i === 0 ? 0 : 8 } }}
              uiBackground={BTN}
              onMouseDown={() => guestPickCategory(cat)}
            >
              <Label
                uiTransform={{ width: '100%', height: '100%' }}
                value={FSM_CATEGORY_LABELS[cat]}
                textAlign={CARD_TEXT_ALIGN}
                fontSize={fontSz}
                font="serif"
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
        <CenteredLabelRow
          value={
            topic
              ? `The reading will focus on ${topic}. The Fortune Teller is choosing the deck…`
              : 'The Fortune Teller is choosing the deck…'
          }
          fontSize={20}
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
        <CenteredLabelRow value="Choose a card." fontSize={18} color={GOLD} height={36} marginBottom={12} />
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
                    fontSize={28}
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
        <CenteredLabelRow
          value={hint}
          fontSize={22}
          color={Color4.create(0.95, 0.95, 0.95, 1)}
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
        <CenteredLabelRow
          value={FSM_CONTINUE_PROMPT}
          fontSize={20}
          color={GOLD}
          height={FSM_CONTINUE_PROMPT_ROW_HEIGHT}
        />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 8 }, height: BTN_ROW_HEIGHT }}>
          <UiEntity uiTransform={{ width: '44%', height: '100%', margin: { right: 12 } }} uiBackground={BTN} onMouseDown={() => guestContinueYes()}>
            <Label uiTransform={{ width: '100%', height: '100%' }} value="Yes" textAlign={CARD_TEXT_ALIGN} fontSize={18} font="serif" />
          </UiEntity>
          <UiEntity uiTransform={{ width: '44%', height: '100%' }} uiBackground={BTN} onMouseDown={() => guestContinueNo()}>
            <Label uiTransform={{ width: '100%', height: '100%' }} value="No" textAlign={CARD_TEXT_ALIGN} fontSize={18} font="serif" />
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
      <InfoBanner text={fsmSession.sessionFinishedMessage} expiresAtMs={fsmSession.sessionFinishedExpiresAtMs ?? undefined} />
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
      </UiEntity>
    </UiEntity>
  )
}
