import type { Fortune } from './types'

export const FORTUNES: Fortune[] = [

  // ❤️ LOVE
  // FUNNY
  { text: 'love trips over its own feet today.', category: 'love', deck: 'funny', type: 'warning' },
  { text: 'romance may act a bit dramatic.', category: 'love', deck: 'funny', type: 'warning' },
  { text: 'someone flirts like a confused cat.', category: 'love', deck: 'funny', type: 'warning' },

  { text: 'laugh first, love figures itself out.', category: 'love', deck: 'funny', type: 'advice' },
  { text: 'don’t overthink, just enjoy the chaos.', category: 'love', deck: 'funny', type: 'advice' },
  { text: 'smile more, it is oddly effective.', category: 'love', deck: 'funny', type: 'advice' },

  { text: 'a silly moment turns into something sweet.', category: 'love', deck: 'funny', type: 'prediction' },
  { text: 'someone laughs at your worst joke.', category: 'love', deck: 'funny', type: 'prediction' },
  { text: 'romance appears in an unexpected meme.', category: 'love', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'unspoken feelings may create distance.', category: 'love', deck: 'serious', type: 'warning' },
  { text: 'emotional imbalance needs attention.', category: 'love', deck: 'serious', type: 'warning' },
  { text: 'past wounds may resurface quietly.', category: 'love', deck: 'serious', type: 'warning' },

  { text: 'communicate clearly and without memes.', category: 'love', deck: 'serious', type: 'advice' },
  { text: 'respect boundaries, yours and theirs.', category: 'love', deck: 'serious', type: 'advice' },
  { text: 'let actions align with your intentions.', category: 'love', deck: 'serious', type: 'advice' },

  { text: 'a meaningful connection deepens.', category: 'love', deck: 'serious', type: 'prediction' },
  { text: 'clarity arrives in your coffee.', category: 'love', deck: 'serious', type: 'prediction' },
  { text: 'a meme will strengthen your bond.', category: 'love', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'love hides behind unusual signals.', category: 'love', deck: 'strange', type: 'warning' },
  { text: 'dreams may blur emotional truth.', category: 'love', deck: 'strange', type: 'warning' },
  { text: 'a connection feels oddly familiar.', category: 'love', deck: 'strange', type: 'warning' },

  { text: 'follow the feeling, not the logic.', category: 'love', deck: 'strange', type: 'advice' },
  { text: 'let mystery guide your heart.', category: 'love', deck: 'strange', type: 'advice' },
  { text: 'accept what cannot be explained.', category: 'love', deck: 'strange', type: 'advice' },

  { text: 'a surreal encounter changes everything.', category: 'love', deck: 'strange', type: 'prediction' },
  { text: 'love appears in an impossible way.', category: 'love', deck: 'strange', type: 'prediction' },
  { text: 'a dream will reveal hidden feelings.', category: 'love', deck: 'strange', type: 'prediction' },

  // 💰 MONEY
  // FUNNY
  { text: 'your wallet feels lighter than usual.', category: 'money', deck: 'funny', type: 'warning' },
  { text: 'a bad deal smiles too much.', category: 'money', deck: 'funny', type: 'warning' },
  { text: 'money disappears like magic.', category: 'money', deck: 'funny', type: 'warning' },

  { text: 'count twice, spend once.', category: 'money', deck: 'funny', type: 'advice' },
  { text: 'don’t trust shiny discounts.', category: 'money', deck: 'funny', type: 'advice' },
  { text: 'save like a paranoid squirrel.', category: 'money', deck: 'funny', type: 'advice' },

  { text: 'a random gain surprises you.', category: 'money', deck: 'funny', type: 'prediction' },
  { text: 'coins align in your favor.', category: 'money', deck: 'funny', type: 'prediction' },
  { text: 'money returns from nowhere.', category: 'money', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'financial pressure may increase.', category: 'money', deck: 'serious', type: 'warning' },
  { text: 'a decision carries long-term impact.', category: 'money', deck: 'serious', type: 'warning' },
  { text: 'overconfidence risks stability.', category: 'money', deck: 'serious', type: 'warning' },

  { text: 'plan with discipline and foresight.', category: 'money', deck: 'serious', type: 'advice' },
  { text: 'control spending habits carefully.', category: 'money', deck: 'serious', type: 'advice' },
  { text: 'think long-term, not immediate.', category: 'money', deck: 'serious', type: 'advice' },

  { text: 'income stabilizes gradually.', category: 'money', deck: 'serious', type: 'prediction' },
  { text: 'a solid opportunity appears.', category: 'money', deck: 'serious', type: 'prediction' },
  { text: 'effort translates into profit.', category: 'money', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'money flows in unpredictable patterns.', category: 'money', deck: 'strange', type: 'warning' },
  { text: 'a strange deal hides meaning.', category: 'money', deck: 'strange', type: 'warning' },
  { text: 'numbers feel oddly symbolic.', category: 'money', deck: 'strange', type: 'warning' },

  { text: 'trust unusual opportunities carefully.', category: 'money', deck: 'strange', type: 'advice' },
  { text: 'follow intuition in transactions.', category: 'money', deck: 'strange', type: 'advice' },
  { text: 'patterns reveal financial paths.', category: 'money', deck: 'strange', type: 'advice' },

  { text: 'a hidden source brings income.', category: 'money', deck: 'strange', type: 'prediction' },
  { text: 'an odd event improves finances.', category: 'money', deck: 'strange', type: 'prediction' },
  { text: 'wealth appears through coincidence.', category: 'money', deck: 'strange', type: 'prediction' },

  // 🧘 HEALTH
  // FUNNY
  { text: 'your body asks for a nap loudly.', category: 'health', deck: 'funny', type: 'warning' },
  { text: 'energy leaks like a bad battery.', category: 'health', deck: 'funny', type: 'warning' },
  { text: 'too much effort, not enough snacks.', category: 'health', deck: 'funny', type: 'warning' },

  { text: 'drink water like it’s a quest.', category: 'health', deck: 'funny', type: 'advice' },
  { text: 'stretch like a lazy cat.', category: 'health', deck: 'funny', type: 'advice' },
  { text: 'rest counts as productivity today.', category: 'health', deck: 'funny', type: 'advice' },

  { text: 'energy returns after a good rest.', category: 'health', deck: 'funny', type: 'prediction' },
  { text: 'a snack improves your entire mood.', category: 'health', deck: 'funny', type: 'prediction' },
  { text: 'you feel better out of nowhere.', category: 'health', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'ignoring signals may delay recovery.', category: 'health', deck: 'serious', type: 'warning' },
  { text: 'stress builds beneath the surface.', category: 'health', deck: 'serious', type: 'warning' },
  { text: 'balance is currently unstable.', category: 'health', deck: 'serious', type: 'warning' },

  { text: 'prioritize rest and recovery.', category: 'health', deck: 'serious', type: 'advice' },
  { text: 'maintain consistent routines.', category: 'health', deck: 'serious', type: 'advice' },
  { text: 'listen to your body carefully.', category: 'health', deck: 'serious', type: 'advice' },

  { text: 'your condition improves steadily.', category: 'health', deck: 'serious', type: 'prediction' },
  { text: 'strength returns with discipline.', category: 'health', deck: 'serious', type: 'prediction' },
  { text: 'balance is restored with coffee.', category: 'health', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'energy shifts feel unpredictable.', category: 'health', deck: 'strange', type: 'warning' },
  { text: 'your body reacts in unusual ways.', category: 'health', deck: 'strange', type: 'warning' },
  { text: 'a hidden imbalance emerges.', category: 'health', deck: 'strange', type: 'warning' },

  { text: 'follow subtle internal signals.', category: 'health', deck: 'strange', type: 'advice' },
  { text: 'let intuition guide your rhythm.', category: 'health', deck: 'strange', type: 'advice' },
  { text: 'slow down to understand changes.', category: 'health', deck: 'strange', type: 'advice' },

  { text: 'a strange calm restores you.', category: 'health', deck: 'strange', type: 'prediction' },
  { text: 'healing comes unexpectedly.', category: 'health', deck: 'strange', type: 'prediction' },
  { text: 'your energy realigns suddenly.', category: 'health', deck: 'strange', type: 'prediction' },

  // 💼 WORK
  // FUNNY
  { text: 'your brain opens 20 tabs at once.', category: 'work', deck: 'funny', type: 'warning' },
  { text: 'focus escapes like a ninja.', category: 'work', deck: 'funny', type: 'warning' },
  { text: 'deadlines stare at you menacingly.', category: 'work', deck: 'funny', type: 'warning' },

  { text: 'do one thing, not everything.', category: 'work', deck: 'funny', type: 'advice' },
  { text: 'coffee is not a strategy.', category: 'work', deck: 'funny', type: 'advice' },
  { text: 'finish before starting new chaos.', category: 'work', deck: 'funny', type: 'advice' },

  { text: 'a task finishes faster than expected.', category: 'work', deck: 'funny', type: 'prediction' },
  { text: 'you accidentally do something right.', category: 'work', deck: 'funny', type: 'prediction' },
  { text: 'a random idea works perfectly.', category: 'work', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'lack of focus reduces quality.', category: 'work', deck: 'serious', type: 'warning' },
  { text: 'a missed detail may escalate.', category: 'work', deck: 'serious', type: 'warning' },
  { text: 'delays impact your progress.', category: 'work', deck: 'serious', type: 'warning' },

  { text: 'prioritize tasks strategically.', category: 'work', deck: 'serious', type: 'advice' },
  { text: 'maintain discipline and consistency.', category: 'work', deck: 'serious', type: 'advice' },
  { text: 'communicate expectations clearly.', category: 'work', deck: 'serious', type: 'advice' },

  { text: 'recognition follows effort.', category: 'work', deck: 'serious', type: 'prediction' },
  { text: 'a new opportunity will arise.', category: 'work', deck: 'serious', type: 'prediction' },
  { text: 'progress becomes visible.', category: 'work', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'work flows in unusual directions.', category: 'work', deck: 'strange', type: 'warning' },
  { text: 'an unclear task confuses outcomes.', category: 'work', deck: 'strange', type: 'warning' },
  { text: 'something feels off in your process.', category: 'work', deck: 'strange', type: 'warning' },

  { text: 'adapt to unexpected changes.', category: 'work', deck: 'strange', type: 'advice' },
  { text: 'trust new solutions today.', category: 'work', deck: 'strange', type: 'advice' },
  { text: 'observe before acting today.', category: 'work', deck: 'strange', type: 'advice' },

  { text: 'an unusual idea succeeds.', category: 'work', deck: 'strange', type: 'prediction' },
  { text: 'a hidden path opens in a meme.', category: 'work', deck: 'strange', type: 'prediction' },
  { text: 'a strange event benefits you.', category: 'work', deck: 'strange', type: 'prediction' },

  // 🔮 MYSTERY
  // FUNNY
  { text: 'the answer hides behind an email.', category: 'mystery', deck: 'funny', type: 'warning' },
  { text: 'avoid coffee and pigeons today.', category: 'mystery', deck: 'funny', type: 'warning' },
  { text: 'your AI is not your friend.', category: 'mystery', deck: 'funny', type: 'warning' },

  { text: 'look again, but slower.', category: 'mystery', deck: 'funny', type: 'advice' },
  { text: 'trust your weird instincts.', category: 'mystery', deck: 'funny', type: 'advice' },
  { text: 'ask the obvious question.', category: 'mystery', deck: 'funny', type: 'advice' },

  { text: 'a clue appears at the right time.', category: 'mystery', deck: 'funny', type: 'prediction' },
  { text: 'something clicks suddenly today.', category: 'mystery', deck: 'funny', type: 'prediction' },
  { text: 'the mystery will solve itself.', category: 'mystery', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'information may be incomplete.', category: 'mystery', deck: 'serious', type: 'warning' },
  { text: 'misinterpretation risks error.', category: 'mystery', deck: 'serious', type: 'warning' },
  { text: 'patience is required for clarity.', category: 'mystery', deck: 'serious', type: 'warning' },

  { text: 'analyze patterns carefully now.', category: 'mystery', deck: 'serious', type: 'advice' },
  { text: 'wait before concluding today.', category: 'mystery', deck: 'serious', type: 'advice' },
  { text: 'seek deeper understanding today.', category: 'mystery', deck: 'serious', type: 'advice' },

  { text: 'truth becomes clear soon.', category: 'mystery', deck: 'serious', type: 'prediction' },
  { text: 'a surprising DM will arrive.', category: 'mystery', deck: 'serious', type: 'prediction' },
  { text: 'clarity resolves confusion today.', category: 'mystery', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'do not worry, reality is broken.', category: 'mystery', deck: 'strange', type: 'warning' },
  { text: 'signs point in conflicting ways.', category: 'mystery', deck: 'strange', type: 'warning' },
  { text: 'not everything is meant to be known.', category: 'mystery', deck: 'strange', type: 'warning' },

  { text: 'embrace the unknown and your DMs.', category: 'mystery', deck: 'strange', type: 'advice' },
  { text: 'let intuition guide who you call.', category: 'mystery', deck: 'strange', type: 'advice' },
  { text: 'accept ambiguity in your plan.', category: 'mystery', deck: 'strange', type: 'advice' },

  { text: 'a hidden truth will emerge for you.', category: 'mystery', deck: 'strange', type: 'prediction' },
  { text: 'reality reveals a deeper layer.', category: 'mystery', deck: 'strange', type: 'prediction' },
  { text: 'an answer will come from nowhere.', category: 'mystery', deck: 'strange', type: 'prediction' },

  // 🍀 LUCK
  // FUNNY
  { text: 'luck forgot your address today.', category: 'luck', deck: 'funny', type: 'warning' },
  { text: 'a chance trips before reaching you.', category: 'luck', deck: 'funny', type: 'warning' },
  { text: 'timing will laugh at your plans.', category: 'luck', deck: 'funny', type: 'warning' },

  { text: 'try anyway, luck likes effort.', category: 'luck', deck: 'funny', type: 'advice' },
  { text: 'be ready today, just in case.', category: 'luck', deck: 'funny', type: 'advice' },
  { text: 'don’t blink, chances are shy.', category: 'luck', deck: 'funny', type: 'advice' },

  { text: 'a lucky moment surprises you.', category: 'luck', deck: 'funny', type: 'prediction' },
  { text: 'something randomly goes right.', category: 'luck', deck: 'funny', type: 'prediction' },
  { text: 'luck shows up late but works.', category: 'luck', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'opportunity may pass unnoticed.', category: 'luck', deck: 'serious', type: 'warning' },
  { text: 'timing misalignment reduces chances.', category: 'luck', deck: 'serious', type: 'warning' },
  { text: 'overreliance on luck is risky.', category: 'luck', deck: 'serious', type: 'warning' },

  { text: 'prepare to meet opportunity.', category: 'luck', deck: 'serious', type: 'advice' },
  { text: 'act with awareness and timing.', category: 'luck', deck: 'serious', type: 'advice' },
  { text: 'recognize subtle chances.', category: 'luck', deck: 'serious', type: 'advice' },

  { text: 'a favorable moment will arrive.', category: 'luck', deck: 'serious', type: 'prediction' },
  { text: 'conditions will align in your favor.', category: 'luck', deck: 'serious', type: 'prediction' },
  { text: 'a calculated risk will pay off.', category: 'luck', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'luck behaves unpredictably.', category: 'luck', deck: 'strange', type: 'warning' },
  { text: 'a strange chance may mislead.', category: 'luck', deck: 'strange', type: 'warning' },
  { text: 'fortune moves in hidden ways.', category: 'luck', deck: 'strange', type: 'warning' },

  { text: 'follow unusual opportunities.', category: 'luck', deck: 'strange', type: 'advice' },
  { text: 'trust odd coincidences and coffee.', category: 'luck', deck: 'strange', type: 'advice' },
  { text: 'stay open to randomness and DMs.', category: 'luck', deck: 'strange', type: 'advice' },

  { text: 'a strange coincidence benefits you.', category: 'luck', deck: 'strange', type: 'prediction' },
  { text: 'luck appears from an unlikely source.', category: 'luck', deck: 'strange', type: 'prediction' },
  { text: 'fortune bends reality slightly.', category: 'luck', deck: 'strange', type: 'prediction' },

]