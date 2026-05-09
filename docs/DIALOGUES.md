# 🎪 Fortune Teller — Complete UI Dialogues

> Full reference of every dialogue string that appears in the UI of *Circus Fortune Teller*.
> All text is organized by context, role, and game phase.

---

## Table of Contents

1. [Category & Kind Labels](#1-category--kind-labels)
2. [Sit Spot Hover Prompts](#2-sit-spot-hover-prompts)
3. [Status Bar](#3-status-bar)
4. [Fortune Teller — Topic Selection (Legacy)](#4-fortune-teller--topic-selection-legacy)
5. [Guest — Theme Prompts](#5-guest--theme-prompts)
6. [Intro Lines (Fortune Teller Spoken)](#6-intro-lines-fortune-teller-spoken)
7. [Confirm Lines (Fortune Teller Asks)](#7-confirm-lines-fortune-teller-asks)
8. [Fortune Teller — Kind Selection](#8-fortune-teller--kind-selection)
9. [Waiting / Status Messages](#9-waiting--status-messages)
10. [Fortune Display](#10-fortune-display)
11. [Repeat / Learn More Prompts](#11-repeat--learn-more-prompts)
12. [Farewell — Max Readings](#12-farewell--max-readings)
13. [Category Rejection Lines](#13-category-rejection-lines)
14. [Center Banner Announcements](#14-center-banner-announcements)
15. [FSM Flow — Host Panel](#15-fsm-flow--host-panel)
16. [FSM Flow — Guest Panel](#16-fsm-flow--guest-panel)
17. [FSM Flow — Spectator & Global](#17-fsm-flow--spectator--global)
18. [Player Role Labels (3D)](#18-player-role-labels-3d)
19. [3D Fortune Overlay](#19-3d-fortune-overlay)

---

## 1. Category & Kind Labels

**Fortune categories** (appear as button labels and in fortune headers):

| Key       | Label       |
|-----------|-------------|
| `love`    | Love        |
| `money`   | Money       |
| `health`  | Health      |
| `work`    | Work        |
| `luck`    | Luck        |
| `travel`  | Travel      |
| `pets`    | Pets        |
| `family`  | Family      |
| `mystery` | Mystery     |

**Fortune kinds** (appear as sub-header in fortune display):

| Key          | Label      |
|--------------|------------|
| `warning`    | Warning    |
| `advice`     | Advice     |
| `prediction` | Prediction |

**FSM Deck options** (host chooses one):

- Funny
- Serious
- Strange

---

## 2. Sit Spot Hover Prompts

> Text shown when the player aims their cursor at an interaction spot.

| Spot                      | Prompt                        |
|---------------------------|-------------------------------|
| Guest Sit Spot            | `Ask For Your Fortune`        |
| Fortune Teller Sit Spot   | `Become The Fortune Teller`   |

---

## 3. Status Bar

> Fixed bar at the top center of the screen.

**Fortune Teller line** (when active):

```
Fortune Teller: {name} | Time: {seconds}s | Readings: [{cards}]
```

**Fortune Teller line** (when free):

```
Fortune Teller: Free
```

**Guest line** (when seated, countdown active):

```
Guest: {name} | Time: {seconds}s | Readings: [{cards}]
```

**Guest line** (when seated, no countdown):

```
Guest: {name} | Readings: [{cards}]
```

**Guest line** (when free):

```
Guest: Free
```

> Cards format: `♥` for filled reading slot, `-` for empty slot. Max 3 slots.

---

## 4. Fortune Teller — Topic Selection (Legacy)

> Shown to the Fortune Teller when `phase === 'ft_asks_topic'`.

**Prompt:**

```
Choose one thread to ask the guest about:
```

The Fortune Teller clicks one of 3 category buttons (Love, Money, Health, Work, Luck, Mystery, etc.).

---

## 5. Guest — Theme Prompts

> Shown to the guest when choosing a category (legacy flow).

| Iteration | Prompt                                                       |
|-----------|--------------------------------------------------------------|
| 1         | `Choose the thread you wish to reveal.`                     |
| 2         | `We have touched one truth; choose another path.`            |
| 3         | `Final choice. The cards will not open again.`               |

The guest clicks one of the available category buttons.

---

## 6. Intro Lines (Fortune Teller Spoken)

> One is selected per category per round (deterministic by salt). Displayed as part of the fortune teller's dialogue before the confirmation question.

**Love ❤️**
- *"I sense something stirring in your heart…"*
- *"Your heart is not at rest…"*
- *"There is a feeling you cannot ignore…"*

**Money 💰**
- *"I sense unease in your fortune…"*
- *"Something shifts in your wealth…"*
- *"Your path with fortune is uncertain…"*

**Work 💼**
- *"Your path of labor feels troubled…"*
- *"There is tension in your work…"*
- *"Your efforts may not lead where you expect…"*

**Health 🏥**
- *"Your strength wavers…"*
- *"I sense imbalance within you…"*
- *"Something in you seeks attention…"*

**Luck 🍀**
- *"Chance does not favor you equally…"*
- *"Luck turns in uncertain ways…"*
- *"Fortune flickers around you…"*

**Mystery 🔮**
- *"Something hidden surrounds you…"*
- *"There is more than meets the eye…"*
- *"A veil lingers over your path…"*

> **Pets, Family, Travel** reuse lines from other categories as fallback.

---

## 7. Confirm Lines (Fortune Teller Asks)

> Shown to the guest when the Fortune Teller suggests a category. The guest chooses **Yes** or **No**.

**Love ❤️**
- *"Shall I reveal what love holds for you?"*
- *"Shall I unveil what love holds for you?"*

**Money 💰**
- *"Shall I reveal what fate holds for your wealth?"*
- *"Shall I reveal what destiny holds for your wealth?"*

**Work 💼**
- *"Shall I reveal what lies ahead in your path of work?"*
- *"Shall I reveal what lies ahead in your work path?"*

**Health 🏥**
- *"Shall I reveal what lies ahead for your well-being?"*
- *"Shall I reveal what lies ahead for your balance and well-being?"*

**Luck 🍀**
- *"Shall I reveal how chance favors you?"*
- *"Shall I reveal how chance may favor you?"*

**Mystery 🔮**
- *"Shall I reveal what lies beyond the veil?"*
- *"Shall I reveal what waits beyond the veil?"*

> **Pets, Family, Travel** reuse lines from other categories as fallback.

---

## 8. Fortune Teller — Kind Selection

> Shown to the Fortune Teller when `phase === 'ft_chooses_kind'`. Three buttons:

| Button      | Description                     |
|-------------|---------------------------------|
| **Warning**   | A cautionary omen              |
| **Advice**    | A guiding recommendation       |
| **Prediction**| A glimpse of what will come    |

---

## 9. Waiting / Status Messages

> Shown to each role depending on the current phase. Used when the player cannot act yet.

### `ft_asks_topic` — Fortune Teller is choosing a topic

| Role                        | Message |
|-----------------------------|---------|
| Guest (human FT)            | *"The Fortune Teller is choosing a thread to ask you about…"* |
| Guest (human FT, iter 2)    | *"We've spoken of {category}… now the Fortune Teller chooses another thread."* |
| Guest (human FT, iter 3)    | *"One final thread is being chosen. Listen closely…"* |
| Fortune Teller              | *(empty — they have the controls)* |
| Spectator (human FT)        | *"Waiting for the Fortune Teller…"* |
| Guest (virtual host)        | *"The oracle is asking what you wish to know — a moment…"* |
| Spectator (virtual host)    | *"The oracle is turning toward the guest…"* |

### `guest_chooses_category` — Guest is picking a theme

| Role   | Message |
|--------|---------|
| Guest  | *(empty — they have the controls)* |
| Others | *"Waiting for the guest to choose a theme…"* |

### `guest_suggested_category_prompt` — Guest decides on the FT's suggestion

| Role   | Message |
|--------|---------|
| Guest  | *(empty — they have the controls)* |
| Others | *"Waiting for the guest to accept or reject the omen…"* |

### `ft_chooses_kind` — Fortune Teller is choosing Warning / Advice / Prediction

| Role                        | Message |
|-----------------------------|---------|
| Guest (human FT)            | *"The Fortune Teller is choosing how to phrase your fortune…"* |
| Fortune Teller              | *(empty — they have the controls)* |
| Spectator (human FT)        | *"Waiting for the Fortune Teller…"* |
| Guest (virtual host)        | *"The oracle is choosing warning, advice, or prediction…"* |
| Spectator (virtual host)    | *"The oracle is shaping the guest's fortune…"* |

### Generic waiting (fallback)

> A pulsing animated line, cycling at random:

- *"Your fate is…"*
- *"Your destiny awaits…"*
- *"The cards have spoken…"*
- *"What lies ahead is…"*

---

## 10. Fortune Display

> Shown to **all players** when a fortune is revealed (`phase === 'fortune_display'`).

**Card header** (gold color):

```
{Category} · {Kind}
```

*Example:*
```
Love · Warning
```

**Fortune body:**

```
{guestName}, {fortune text}
```

*Example:*
```
Alice, Beware of a sudden change in your romantic path — a shadow approaches from where you least expect it.
```

> The fortune text itself comes from the `FORTUNES` data pool and varies by category, deck, and kind.

---

## 11. Repeat / Learn More Prompts

> Shown to the **guest** (and FT/spectators) after the fortune display ends. The guest chooses **Yes** or **No**.

One line is selected deterministically per session:

- *"Shall we look deeper?"*
- *"Would you dare to know more?"*
- *"The cards still whisper… shall I listen?"*
- *"There is more to uncover… will you hear it?"*
- *"Do you wish me to go on?"*
- *"Another thread awaits… shall I pull it?"*
- *"The veil has not fully lifted… continue?"*
- *"I can see further… if you allow it."*
- *"The future stirs again… shall I reveal it?"*
- *"One more glimpse… do you seek it?"*

**Fortune Teller version** (when a human FT is present):

```
{prompt}
Ask the guest. They will choose Yes or No.
```

**Spectator version:**

```
The guest decides whether to hear another reading…
```

---

## 12. Farewell — Max Readings

> Shown after the 3rd reading in a seat session. One line selected deterministically.

- *"Do not tempt fate—you've learned enough."*
- *"The cards have spoken. No more."*
- *"Your fate is sealed. Ask no further."*
- *"Some truths are not meant to be chased."*
- *"Tempt not fate—you've seen enough."*
- *"The veil closes. No more questions."*
- *"Your path is revealed. Go no further."*
- *"The spirits fall silent. It is done."*
- *"No more threads may be pulled."*
- *"What's known is enough—press no further."*

---

## 13. Category Rejection Lines

> Shown as a center banner when the guest tries to pick a category already used in the current session.

- *"The cards refuse to speak of the same thread twice."*
- *"That path has already been unveiled."*

---

## 14. Center Banner Announcements

> Brief messages that appear centered on screen for a few seconds.

| Trigger                        | Message |
|--------------------------------|---------|
| Guest sits down                | `{name} is becoming the Guest` |
| FT has 1 reading left          | `{name}, 1 reading left` |
| FT leaves the chair            | `{previousName} is no longer the Fortune Teller` |
| Guest picks a repeated category | (see [Category Rejection Lines](#13-category-rejection-lines)) |
| FSM guest picks a category     | `Selected category: {label}` |

---

## 15. FSM Flow — Host Panel

> Shown to the **Fortune Teller (host)** when the FSM flow is active.

### State: `INIT`
```
Ask the Guest:
```
**Button:** `What do you want to know?`

### State: `CATEGORY_SELECTION`
```
The Guest is choosing a focus for the reading.
```

### State: `DECK_SELECTION`
```
Fortune Teller clicks one deck
```
**Buttons:** `Funny` | `Serious` | `Strange`

### State: `CARD_SELECTION`
```
Guest will pick a card.
```

### State: `FORTUNE_SELECTION`
```
Guest chose card {A/B/C}. Fortune Teller, pick a meaning:
```
**Buttons:** `Prediction` | `Advice` | `Warning`

### State: `CONTINUE_DECISION`
```
Do you want another reading?
Ask the guest. They will choose Yes or No.
```

---

## 16. FSM Flow — Guest Panel

> Shown to the **Guest** when the FSM flow is active.

### State: `INIT`
```
Reading starts…
```

### State: `CATEGORY_SELECTION`
```
What do you want to know?
```
**Buttons** — up to 3 category options (Love, Money, Health, Work, Luck, Mystery, etc.)

### State: `DECK_SELECTION`
```
The reading will focus on {topic}. The Fortune Teller is choosing the deck…
```

### State: `CARD_SELECTION`
```
Choose a card.
```
Three face-down tarot cards. The guest clicks one.

### State: `FORTUNE_SELECTION`
```
Reading the cards…
```
*(transitions after a brief delay to)*
```
It is becoming clear…
```

### State: `CONTINUE_DECISION`
```
Do you want another reading?
```
**Buttons:** `Yes` | `No`

---

## 17. FSM Flow — Spectator & Global

**Spectator — CONTINUE_DECISION:**
```
The guest decides whether to hear another reading…
```

**Global "finished" message** (shown to all when session ends):
```
Your reading is finished
```

**FSM Reveal fortune format:**
```
{guestName}, {fortuneBody}
```

**Fallback fortune texts** (when no fortune is available):
- *"The cards remain silent."*
- *"The cards are unclear."*

---

## 18. Player Role Labels (3D)

> Floating labels above players' heads in-world.

| Role             | Label               |
|------------------|---------------------|
| Fortune Teller   | `Fortune Teller`    |
| Guest            | `Guest`             |

---

## 19. 3D Fortune Overlay

> Floating text above the Wizard's head during fortune display.

**Format:**
```
{guestName}:
{Category} · {Kind}:
{fortuneText}
```

*Example:*
```
Alice:
Love · Warning:
Beware of a sudden change in your romantic path…
```

---

> *Last updated: May 2026*  
> *Source: src/ui.tsx, src/fortuneFsm/fsmUi.tsx, src/revelationRng.ts, src/fortuneTellerGuestStatusUi.tsx, src/fortune3DText.ts, src/playerRoleLabels.ts, src/setupWizard.ts, src/setupGuestSpot.ts*

| Context                    | Button / Action       |
|----------------------------|-----------------------|
| Guest accepts FT's suggestion | **Yes**             |
| Guest rejects FT's suggestion | **No**              |
| Guest wants another reading   | **Yes**             |
| Guest declines more readings  | **No**              |
| Guest cancel session (×)      | **×** (top-right corner) |
| FSM Guest continue — Yes      | **Yes**             |
| FSM Guest continue — No       | **No**              |
| FSM Host — Prediction         | **Prediction**      |
| FSM Host — Advice             | **Advice**          |
| FSM Host — Warning            | **Warning**         |

---

> *Last updated: May 2026*  
> *Source: src/ui.tsx, src/fortuneFsm/fsmUi.tsx, src/revelationRng.ts, src/fortuneTellerGuestStatusUi.tsx, src/fortune3DText.ts, src/playerRoleLabels.ts, src/setupWizard.ts, src/setupGuestSpot.ts*
