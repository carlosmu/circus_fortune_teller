import ReactEcs, { Label, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { gameData } from '../gameState'
import { FORTUNE_DISPLAY_DURATION, SHOW_UI_FORTUNE, USE_FORTUNE_FSM_FLOW } from '../sceneConfig'
import {
  guestContinueNo,
  guestContinueYes,
  guestPickCard,
  guestPickCategory,
  hostOpenCategorySelection,
  hostPickDeck,
  hostPickFortune
} from './actions'
import { playButtonClick } from '../fortuneSync'
import type { FortuneCategory } from '../types'
import { FSM_CATEGORY_LABELS, getFsmCategoryOffer } from './categories'
import { getFsmRevealKindTitle, getSyncedRevealFortuneText } from './resolveRevealFortune'
import { fsmSession } from './session'
import type { FsmCardChoice, FsmDeck } from './types'
import {
  CARD_VERTICAL_OFFSET,
  CARD_BG,
  CARD_CONTENT_LAYER,
  CARD_ROOT_COLUMN,
  getCardSize
} from '../cardLayout'
import { CenteredLabelRow } from '../centeredLabelRow'

const TAROT_BACK = 'assets/images/tarot_back_01.jpg'
/** Proporción real del asset (ancho ÷ alto). Ajusta si cambias la imagen. */
const TAROT_TEXTURE_WIDTH = 722
const TAROT_TEXTURE_HEIGHT = 1226
const TAROT_CARD_DISPLAY_HEIGHT = 120
const TAROT_CARD_DISPLAY_WIDTH = Math.round(
  (TAROT_CARD_DISPLAY_HEIGHT * TAROT_TEXTURE_WIDTH) / TAROT_TEXTURE_HEIGHT
)
/** Botones sobre card.png (prompt, categoría, deck, meanings). No usar en Yes/No. */
/** Fondo #1e003a; borde magenta sin cambiar. */
const CARD_BTN_BG = { color: Color4.create(30 / 255, 0, 58 / 255, 0.5) }
const CARD_BTN_BORDER = Color4.create(0.82, 0.28, 0.78, 0.42)
const CARD_BTN_RADIUS = 10
const CARD_BTN_PADDING = { top: 7, bottom: 7, left: 12, right: 12 } as const
const CARD_BTN_BASE_TRANSFORM = {
  padding: CARD_BTN_PADDING,
  borderRadius: CARD_BTN_RADIUS,
  borderWidth: 1,
  borderColor: CARD_BTN_BORDER,
  flexDirection: 'row' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const
}
const SESSION_FINISHED_FADE_MS = 500
const REVEAL_TEXT_FADE_IN_MS = SESSION_FINISHED_FADE_MS
const REVEAL_TEXT_FADE_OUT_MS = SESSION_FINISHED_FADE_MS
const REVEAL_TEXT_VISIBLE_MS = FORTUNE_DISPLAY_DURATION * 1000

/** Filas reveal: mismo patrón que CONTINUE_DECISION (CenteredLabelRow + CARD_LABEL_TEXT_ALIGN). */
const REVEAL_TITLE_ROW_HEIGHT = 40
const REVEAL_BODY_ROW_HEIGHT = 280
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
const CARD_CONTENT_START_OFFSET = 225

const CARD_TEXT_ALIGN: 'middle-center' = 'middle-center'
const CARD_LABEL_TEXT_ALIGN: 'top-center' = 'top-center'

/** Pregunta fija en CONTINUE_DECISION (invitado + host); el legacy sigue usando `repeatFortunePrompt.ts`. */
const FSM_CONTINUE_PROMPT = 'Do you want another reading?'
/** Tras elegir meaning (A/B/C) hasta la pantalla REVEAL. */
const FSM_REVEALING_DESTINY_MESSAGE = 'Revealing your destiny...'

function isFortuneRevealWait(): boolean {
  return fsmSession.selectedFortune !== null && fsmSession.hostFortunePickedAtMs !== null
}

function RevealingDestinyPanel(props: { guest?: boolean }) {
  const inner = (
    <CenteredLabelRow
      textAlign={CARD_LABEL_TEXT_ALIGN}
      value={FSM_REVEALING_DESTINY_MESSAGE}
      fontSize={CARD_UI_FONT_SIZE}
      color={GOLD}
      height={CARD_READING_BOOKEND_ROW_HEIGHT}
    />
  )
  return props.guest ? <GuestCardShell>{inner}</GuestCardShell> : <HostCardShell>{inner}</HostCardShell>
}
/** Altura de fila acorde a {@link CARD_UI_FONT_SIZE} (una línea de pregunta antes de Sí/No / texto host). */
const FSM_CONTINUE_PROMPT_ROW_HEIGHT = 52
/** Una línea en CenteredLabelRow (DCL no respeta `\n` en Label de forma fiable). */
const CARD_SINGLE_LINE_ROW_HEIGHT = 36

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
  const body = getSyncedRevealFortuneText(fsmSession)
  const fortuneText = `${name}, ${body}`
  const revealElapsedMs = fsmSession.revealEnteredAtMs === null ? null : Date.now() - fsmSession.revealEnteredAtMs
  const fadeInAlpha =
    revealElapsedMs === null ? 1 : Math.min(1, Math.max(0, revealElapsedMs / REVEAL_TEXT_FADE_IN_MS))
  const fadeOutAlpha =
    revealElapsedMs === null
      ? 1
      : Math.min(1, Math.max(0, (REVEAL_TEXT_VISIBLE_MS - revealElapsedMs) / REVEAL_TEXT_FADE_OUT_MS))
  const revealTextAlpha = Math.min(fadeInAlpha, fadeOutAlpha)
  const revealTitleColor = Color4.create(GOLD.r, GOLD.g, GOLD.b, GOLD.a * revealTextAlpha)
  const revealBodyColor = Color4.create(CARD_WHITE.r, CARD_WHITE.g, CARD_WHITE.b, CARD_WHITE.a * revealTextAlpha)

  return (
    <UiEntity uiTransform={{ width: '100%', flexDirection: 'column', alignItems: 'stretch' }}>
      <CenteredLabelRow
        textAlign={CARD_LABEL_TEXT_ALIGN}
        value={kindTitle || '—'}
        fontSize={CARD_UI_FONT_SIZE}
        color={revealTitleColor}
        height={REVEAL_TITLE_ROW_HEIGHT}
      />
      <CenteredLabelRow
        textAlign={CARD_LABEL_TEXT_ALIGN}
        value={fortuneText}
        fontSize={CARD_UI_FONT_SIZE}
        color={revealBodyColor}
        height={REVEAL_BODY_ROW_HEIGHT}
      />
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

function SpectatorPanel() {
  const st = fsmSession.state

  if (st === 'INIT') {
    return (
      <HostCardShell>
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value="Reading starts..."
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={CARD_READING_BOOKEND_ROW_HEIGHT}
        />
      </HostCardShell>
    )
  }

  if (st === 'CATEGORY_SELECTION') {
    return (
      <HostCardShell>
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value="The guest is choosing"
          fontSize={CARD_UI_FONT_SIZE}
          color={CARD_WHITE}
          height={CARD_SINGLE_LINE_ROW_HEIGHT}
        />
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value="a focus for the reading..."
          fontSize={CARD_UI_FONT_SIZE}
          color={CARD_WHITE}
          height={CARD_SINGLE_LINE_ROW_HEIGHT}
        />
      </HostCardShell>
    )
  }

  if (st === 'DECK_SELECTION') {
    return (
      <HostCardShell>
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value="The Fortune Teller is choosing a deck..."
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={100}
        />
      </HostCardShell>
    )
  }

  if (st === 'CARD_SELECTION') {
    return (
      <HostCardShell>
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value="The guest is choosing a card..."
          fontSize={CARD_UI_FONT_SIZE}
          color={CARD_WHITE}
          height={80}
        />
      </HostCardShell>
    )
  }

  if (st === 'FORTUNE_SELECTION') {
    if (isFortuneRevealWait()) return <RevealingDestinyPanel />
    const hint =
      fsmSession.fortuneGuestHint === 'clear'
        ? 'It is becoming clear...'
        : 'Reading the cards...'
    return (
      <HostCardShell>
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value={hint}
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={80}
        />
      </HostCardShell>
    )
  }

  if (st === 'REVEAL') {
    return <RevealFortuneOnCard />
  }

  if (st === 'CONTINUE_DECISION') {
    return <SpectatorContinueWaitPanel />
  }

  return null
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

/** Botón violeta/magenta sobre card.png. `layout="auto"` = tamaño al texto; `fill` = ocupa el uiTransform del padre. */
function CardStyledButton({
  label,
  onPress,
  layout = 'fill',
  uiTransform,
  key
}: {
  label: string
  onPress: () => void
  layout?: 'auto' | 'fill'
  uiTransform?: UiTransformProps
  key?: string | number
}) {
  const transform: UiTransformProps =
    layout === 'auto'
      ? { ...CARD_BTN_BASE_TRANSFORM, width: 'auto', height: 'auto', ...uiTransform }
      : { ...CARD_BTN_BASE_TRANSFORM, ...uiTransform }
  const labelTransform: UiTransformProps =
    layout === 'auto' ? { width: 'auto', height: 'auto' } : { width: '100%', height: '100%' }

  return (
    <UiEntity
      key={key}
      uiTransform={transform}
      uiBackground={CARD_BTN_BG}
      onMouseDown={() => {
        playButtonClick()
        onPress()
      }}
    >
      <Label
        uiTransform={labelTransform}
        value={label}
        textAlign={CARD_TEXT_ALIGN}
        fontSize={CARD_UI_FONT_SIZE}
        font="serif"
        color={CARD_WHITE}
      />
    </UiEntity>
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
          <CardStyledButton layout="auto" label="What do you want to know?" onPress={() => hostOpenCategorySelection()} />
        </UiEntity>
      </HostCardShell>
    )
  }

  if (st === 'CATEGORY_SELECTION') {
    return (
      <HostCardShell>
        {/* FIX */}
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value="The Guest is choosing"
          fontSize={CARD_UI_FONT_SIZE}
          color={Color4.create(0.95, 0.95, 0.95, 1)}
          height={CARD_SINGLE_LINE_ROW_HEIGHT}
        />
        <CenteredLabelRow
          textAlign={CARD_LABEL_TEXT_ALIGN}
          value="a focus for the reading."
          fontSize={CARD_UI_FONT_SIZE}
          color={Color4.create(0.95, 0.95, 0.95, 1)}
          height={CARD_SINGLE_LINE_ROW_HEIGHT}
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
            <CardStyledButton
              key={d}
              label={d}
              onPress={() => hostPickDeck(d)}
              uiTransform={{ width: '29%', height: '100%', margin: { left: i === 0 ? 0 : 10 } }}
            />
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

  if (st === 'FORTUNE_SELECTION' && isFortuneRevealWait()) {
    return <RevealingDestinyPanel />
  }

  if (st === 'FORTUNE_SELECTION' && fsmSession.selectedCardType) {
    return (
      <HostCardShell>
        {/* FIX */}
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN}
          value={`Guest chose card ${fsmSession.selectedCardType}.\nFortune Teller, pick a meaning:`}
          fontSize={CARD_UI_FONT_SIZE}
          color={GOLD}
          height={72}
        />
        <UiEntity uiTransform={{ ...CARD_CONTROL_ROW, margin: { top: 8 }, height: BTN_ROW_HEIGHT }}>
          {(
            [
              { choice: 'A' as const, label: 'Prediction' },
              { choice: 'B' as const, label: 'Advice' },
              { choice: 'C' as const, label: 'Warning' }
            ] as const
          ).map(({ choice, label }, i) => (
            <CardStyledButton
              key={choice}
              label={label}
              onPress={() => hostPickFortune(choice)}
              uiTransform={{ width: '29%', height: '100%', margin: { left: i === 0 ? 0 : 10 } }}
            />
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
            <CardStyledButton
              key={cat}
              label={FSM_CATEGORY_LABELS[cat]}
              onPress={() => guestPickCategory(cat)}
              uiTransform={{ width: btnWidth, height: '100%', margin: { left: i === 0 ? 0 : 8 } }}
            />
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
              ? `The Fortune Teller \nis choosing the deck…`
              : 'The Fortune Teller \nis choosing the deck…'
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
        <CenteredLabelRow textAlign={CARD_LABEL_TEXT_ALIGN} value="Choose a card:" fontSize={CARD_UI_FONT_SIZE} color={CARD_WHITE} height={48} marginBottom={12} />
        <UiEntity
          uiTransform={{
            ...CARD_CONTROL_ROW,
            height: TAROT_CARD_DISPLAY_HEIGHT,
            maxWidth: '100%'
          }}
        >
          {CARD_SLOTS.map(({ key, idx }, i) => {
            const flipped = fsmSession.cardFlipIndex === idx
            return (
              <UiEntity
                key={key}
                uiTransform={{
                  width: TAROT_CARD_DISPLAY_WIDTH,
                  height: TAROT_CARD_DISPLAY_HEIGHT,
                  margin: { left: i === 0 ? 0 : 32 },
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                uiBackground={{ texture: { src: TAROT_BACK }, textureMode: 'stretch' }}
                onMouseDown={() => { playButtonClick(); guestPickCard(key, idx) }}
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
    if (isFortuneRevealWait()) return <RevealingDestinyPanel guest />
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
            onMouseDown={() => { playButtonClick(); guestContinueYes() }}
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
            onMouseDown={() => { playButtonClick(); guestContinueNo() }}
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
        {fsmSession.active && isHost && <HostPanel />}
        {fsmSession.active && isGuest && <GuestPanel />}
        {fsmSession.active && !isHost && !isGuest && <SpectatorPanel />}
        {showSessionFinishedOnCard && <SessionFinishedOnCard uid={uid} />}
      </UiEntity>
    </UiEntity>
  )
}
