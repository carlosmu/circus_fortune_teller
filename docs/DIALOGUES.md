# 🎪 Fortune Teller — UI Flow Dialogues

> Step-by-step flow of every screen on the **card.png** UI, organized by role and sequence.

---

## Flow Overview

```
INIT → CATEGORY_SELECTION → DECK_SELECTION → CARD_SELECTION → FORTUNE_SELECTION → REVEAL → CONTINUE_DECISION
                                                                                              │
                                                                                   ┌──────────┴──────────┐
                                                                                   ▼                    ▼
                                                                              Yes (loop)              No (end)
```

---

## 1 — INIT

| Role   | Screen                                                                 |
|--------|------------------------------------------------------------------------|
| **Host** | **"Ask the Guest:"** → Button: **[What do you want to know?]**        |
| **Guest** | **"Reading starts…"** (waiting)                                       |
| **Spectator** | *(nothing yet — session just started)*                           |

---

## 2 — CATEGORY_SELECTION

| Role   | Screen                                                                 |
|--------|------------------------------------------------------------------------|
| **Host** | **"The Guest is choosing a focus for the reading."** (waiting)        |
| **Guest** | **"What do you want to know?"** → Choose from up to 3 category buttons |
| **Spectator** | *(same as Host — waiting)*                                        |

---

## 3 — DECK_SELECTION

| Role   | Screen                                                                 |
|--------|------------------------------------------------------------------------|
| **Host** | **"Fortune Teller clicks one deck"** → Choose: **[Funny]** **[Serious]** **[Strange]** |
| **Guest** | **"The reading will focus on {topic}. The Fortune Teller is choosing the deck…"** (waiting) |
| **Spectator** | *(waiting)*                                                       |

---

## 4 — CARD_SELECTION

| Role   | Screen                                                                 |
|--------|------------------------------------------------------------------------|
| **Host** | **"Guest will pick a card."** (waiting)                               |
| **Guest** | **"Choose a card."** → 3 face-down tarot cards. Click one to flip it (reveals **A**, **B**, or **C**). |
| **Spectator** | *(waiting)*                                                       |

---

## 5 — FORTUNE_SELECTION

| Role   | Screen                                                                 |
|--------|------------------------------------------------------------------------|
| **Host** | **"Guest chose card {A/B/C}. Fortune Teller, pick a meaning:"** → Choose: **[Prediction]** **[Advice]** **[Warning]** |
| **Guest** | Phase 1: **"Reading the cards…"** → Phase 2: **"It is becoming clear…"** |
| **Spectator** | *(waiting)*                                                       |

---

## 6 — REVEAL

> Shown to **everyone** (Host, Guest, Spectator).

| Element       | Content                                                   |
|---------------|-----------------------------------------------------------|
| **Title**     | **Prediction** / **Advice** / **Warning** *(gold)*        |
| **Body**      | **"{GuestName}, {fortune text}"**                         |

After a few seconds, the card auto-advances to **CONTINUE_DECISION**.

---

## 7 — CONTINUE_DECISION

| Role        | Screen                                                                |
|-------------|-----------------------------------------------------------------------|
| **Host**    | **"Do you want another reading?"** → **"Ask the guest. They will choose Yes or No."** (waiting) |
| **Guest**   | **"Do you want another reading?"** → **[Yes]** **[No]**               |
| **Spectator** | **"The guest decides whether to hear another reading..."** (waiting) |

- **Yes** → Loops back to **CATEGORY_SELECTION** (step 2) with fresh category options.
- **No** → Session ends. Shows **"Your reading is finished"** overlay for 4.5 seconds, then resets.

---

## 8 — Session End (Max Readings)

After **3 readings** in the same seat, instead of CONTINUE_DECISION the guest sees a **farewell line** (randomly picked):

> "Do not tempt fate—you've learned enough."
> "The cards have spoken. No more."
> "Your fate is sealed. Ask no further."
> "Some truths are not meant to be chased."
> "Tempt not fate—you've seen enough."
> "The veil closes. No more questions."
> "Your path is revealed. Go no further."
> "The spirits fall silent. It is done."
> "No more threads may be pulled."
> "What's known is enough—press no further."

---

## Reference Lists

### Decks (3)

| # | Deck     |
|---|----------|
| 1 | Funny    |
| 2 | Serious  |
| 3 | Strange  |

### Fortune Kinds (3)

| # | Kind       | Mapped From |
|---|------------|-------------|
| 1 | Prediction | Card A      |
| 2 | Advice     | Card B      |
| 3 | Warning    | Card C      |

### Fortune Categories (9)

| # | Category |
|---|----------|
| 1 | Love     |
| 2 | Money    |
| 3 | Health   |
| 4 | Work     |
| 5 | Luck     |
| 6 | Travel   |
| 7 | Pets     |
| 8 | Family   |
| 9 | Mystery  |

> Up to **3 categories** are offered per round from the available pool. Categories already used in the session are excluded until all 6 core categories (Love, Money, Health, Work, Luck, Mystery) are exhausted — then the pool resets.

### Card Slots (3)

| # | Letter |
|---|--------|
| 1 | A      |
| 2 | B      |
| 3 | C      |

### Fallback Texts

| Situation                               | Text                          |
|-----------------------------------------|-------------------------------|
| No category / deck / fortune selected   | "The cards remain silent."    |
| Pool empty for the chosen combination   | "The cards are unclear."      |

### Session End Text

| Trigger            | Text                              |
|--------------------|-----------------------------------|
| Guest says No      | "Your reading is finished"        |
| Max readings (3)   | *(one of the 10 farewell lines)*  |

---

> *Last updated: May 2026*
> *Source: src/fortuneFsm/fsmUi.tsx, src/fortuneFsm/resolveRevealFortune.ts, src/fortuneFsm/categories.ts, src/fortuneFsm/actions.ts, src/revelationRng.ts*
