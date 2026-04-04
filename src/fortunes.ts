import type { Fortune } from './types'

export const FORTUNES: Fortune[] = [

  // ❤️ LOVE
  // FUNNY
  { text: 'Love trips over its own feet today.', category: 'love', deck: 'funny', type: 'warning' },
  { text: 'Romance may act a bit dramatic.', category: 'love', deck: 'funny', type: 'warning' },
  { text: 'Someone flirts like a confused cat.', category: 'love', deck: 'funny', type: 'warning' },

  { text: 'Laugh first, love figures itself out.', category: 'love', deck: 'funny', type: 'advice' },
  { text: 'Don’t overthink, just enjoy the chaos.', category: 'love', deck: 'funny', type: 'advice' },
  { text: 'Smile more, it’s oddly effective.', category: 'love', deck: 'funny', type: 'advice' },

  { text: 'A silly moment turns into something sweet.', category: 'love', deck: 'funny', type: 'prediction' },
  { text: 'Someone laughs at your worst joke.', category: 'love', deck: 'funny', type: 'prediction' },
  { text: 'Romance appears in an unexpected meme.', category: 'love', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'Unspoken feelings may create distance.', category: 'love', deck: 'serious', type: 'warning' },
  { text: 'Emotional imbalance needs attention.', category: 'love', deck: 'serious', type: 'warning' },
  { text: 'Past wounds may resurface quietly.', category: 'love', deck: 'serious', type: 'warning' },

  { text: 'Communicate clearly and without fear.', category: 'love', deck: 'serious', type: 'advice' },
  { text: 'Respect boundaries, yours and theirs.', category: 'love', deck: 'serious', type: 'advice' },
  { text: 'Let actions align with your intentions.', category: 'love', deck: 'serious', type: 'advice' },

  { text: 'A meaningful connection deepens.', category: 'love', deck: 'serious', type: 'prediction' },
  { text: 'Clarity arrives in your relationships.', category: 'love', deck: 'serious', type: 'prediction' },
  { text: 'A decision strengthens your bond.', category: 'love', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'Love hides behind unusual signals.', category: 'love', deck: 'strange', type: 'warning' },
  { text: 'Dreams may blur emotional truth.', category: 'love', deck: 'strange', type: 'warning' },
  { text: 'A connection feels oddly familiar.', category: 'love', deck: 'strange', type: 'warning' },

  { text: 'Follow the feeling, not the logic.', category: 'love', deck: 'strange', type: 'advice' },
  { text: 'Let mystery guide your heart.', category: 'love', deck: 'strange', type: 'advice' },
  { text: 'Accept what cannot be explained.', category: 'love', deck: 'strange', type: 'advice' },

  { text: 'A surreal encounter changes everything.', category: 'love', deck: 'strange', type: 'prediction' },
  { text: 'Love appears in an impossible way.', category: 'love', deck: 'strange', type: 'prediction' },
  { text: 'A dream reveals hidden feelings.', category: 'love', deck: 'strange', type: 'prediction' },

  // 💰 MONEY
  // FUNNY
  { text: 'Your wallet feels lighter than usual.', category: 'money', deck: 'funny', type: 'warning' },
  { text: 'A bad deal smiles too much.', category: 'money', deck: 'funny', type: 'warning' },
  { text: 'Money disappears like magic.', category: 'money', deck: 'funny', type: 'warning' },

  { text: 'Count twice, spend once.', category: 'money', deck: 'funny', type: 'advice' },
  { text: 'Don’t trust shiny discounts.', category: 'money', deck: 'funny', type: 'advice' },
  { text: 'Save like a paranoid squirrel.', category: 'money', deck: 'funny', type: 'advice' },

  { text: 'A random gain surprises you.', category: 'money', deck: 'funny', type: 'prediction' },
  { text: 'Coins align in your favor.', category: 'money', deck: 'funny', type: 'prediction' },
  { text: 'Money returns from nowhere.', category: 'money', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'Financial pressure may increase.', category: 'money', deck: 'serious', type: 'warning' },
  { text: 'A decision carries long-term impact.', category: 'money', deck: 'serious', type: 'warning' },
  { text: 'Overconfidence risks stability.', category: 'money', deck: 'serious', type: 'warning' },

  { text: 'Plan with discipline and foresight.', category: 'money', deck: 'serious', type: 'advice' },
  { text: 'Control spending habits carefully.', category: 'money', deck: 'serious', type: 'advice' },
  { text: 'Think long-term, not immediate.', category: 'money', deck: 'serious', type: 'advice' },

  { text: 'Income stabilizes gradually.', category: 'money', deck: 'serious', type: 'prediction' },
  { text: 'A solid opportunity appears.', category: 'money', deck: 'serious', type: 'prediction' },
  { text: 'Effort translates into profit.', category: 'money', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'Money flows in unpredictable patterns.', category: 'money', deck: 'strange', type: 'warning' },
  { text: 'A strange deal hides meaning.', category: 'money', deck: 'strange', type: 'warning' },
  { text: 'Numbers feel oddly symbolic.', category: 'money', deck: 'strange', type: 'warning' },

  { text: 'Trust unusual opportunities carefully.', category: 'money', deck: 'strange', type: 'advice' },
  { text: 'Follow intuition in transactions.', category: 'money', deck: 'strange', type: 'advice' },
  { text: 'Patterns reveal financial paths.', category: 'money', deck: 'strange', type: 'advice' },

  { text: 'A hidden source brings income.', category: 'money', deck: 'strange', type: 'prediction' },
  { text: 'An odd event improves finances.', category: 'money', deck: 'strange', type: 'prediction' },
  { text: 'Wealth appears through coincidence.', category: 'money', deck: 'strange', type: 'prediction' },

  // 🧘 HEALTH
  // FUNNY
  { text: 'Your body asks for a nap loudly.', category: 'health', deck: 'funny', type: 'warning' },
  { text: 'Energy leaks like a bad battery.', category: 'health', deck: 'funny', type: 'warning' },
  { text: 'Too much effort, not enough snacks.', category: 'health', deck: 'funny', type: 'warning' },

  { text: 'Drink water like it’s a quest.', category: 'health', deck: 'funny', type: 'advice' },
  { text: 'Stretch like a lazy cat.', category: 'health', deck: 'funny', type: 'advice' },
  { text: 'Rest counts as productivity today.', category: 'health', deck: 'funny', type: 'advice' },

  { text: 'Energy returns after a good rest.', category: 'health', deck: 'funny', type: 'prediction' },
  { text: 'A snack improves your entire mood.', category: 'health', deck: 'funny', type: 'prediction' },
  { text: 'You feel better out of nowhere.', category: 'health', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'Ignoring signals may delay recovery.', category: 'health', deck: 'serious', type: 'warning' },
  { text: 'Stress builds beneath the surface.', category: 'health', deck: 'serious', type: 'warning' },
  { text: 'Balance is currently unstable.', category: 'health', deck: 'serious', type: 'warning' },

  { text: 'Prioritize rest and recovery.', category: 'health', deck: 'serious', type: 'advice' },
  { text: 'Maintain consistent routines.', category: 'health', deck: 'serious', type: 'advice' },
  { text: 'Listen to your body carefully.', category: 'health', deck: 'serious', type: 'advice' },

  { text: 'Your condition improves steadily.', category: 'health', deck: 'serious', type: 'prediction' },
  { text: 'Strength returns with discipline.', category: 'health', deck: 'serious', type: 'prediction' },
  { text: 'Balance is restored soon.', category: 'health', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'Energy shifts feel unpredictable.', category: 'health', deck: 'strange', type: 'warning' },
  { text: 'Your body reacts in unusual ways.', category: 'health', deck: 'strange', type: 'warning' },
  { text: 'A hidden imbalance emerges.', category: 'health', deck: 'strange', type: 'warning' },

  { text: 'Follow subtle internal signals.', category: 'health', deck: 'strange', type: 'advice' },
  { text: 'Let intuition guide your rhythm.', category: 'health', deck: 'strange', type: 'advice' },
  { text: 'Slow down to understand changes.', category: 'health', deck: 'strange', type: 'advice' },

  { text: 'A strange calm restores you.', category: 'health', deck: 'strange', type: 'prediction' },
  { text: 'Healing comes unexpectedly.', category: 'health', deck: 'strange', type: 'prediction' },
  { text: 'Your energy realigns suddenly.', category: 'health', deck: 'strange', type: 'prediction' },

  // 💼 WORK
  // FUNNY
  { text: 'Your brain opens 20 tabs at once.', category: 'work', deck: 'funny', type: 'warning' },
  { text: 'Focus escapes like a ninja.', category: 'work', deck: 'funny', type: 'warning' },
  { text: 'Deadlines stare at you menacingly.', category: 'work', deck: 'funny', type: 'warning' },

  { text: 'Do one thing, not everything.', category: 'work', deck: 'funny', type: 'advice' },
  { text: 'Coffee is not a strategy.', category: 'work', deck: 'funny', type: 'advice' },
  { text: 'Finish before starting new chaos.', category: 'work', deck: 'funny', type: 'advice' },

  { text: 'A task finishes faster than expected.', category: 'work', deck: 'funny', type: 'prediction' },
  { text: 'You accidentally do something right.', category: 'work', deck: 'funny', type: 'prediction' },
  { text: 'A random idea works perfectly.', category: 'work', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'Lack of focus reduces quality.', category: 'work', deck: 'serious', type: 'warning' },
  { text: 'A missed detail may escalate.', category: 'work', deck: 'serious', type: 'warning' },
  { text: 'Delays impact your progress.', category: 'work', deck: 'serious', type: 'warning' },

  { text: 'Prioritize tasks strategically.', category: 'work', deck: 'serious', type: 'advice' },
  { text: 'Maintain discipline and consistency.', category: 'work', deck: 'serious', type: 'advice' },
  { text: 'Communicate expectations clearly.', category: 'work', deck: 'serious', type: 'advice' },

  { text: 'Recognition follows effort.', category: 'work', deck: 'serious', type: 'prediction' },
  { text: 'A new opportunity arises.', category: 'work', deck: 'serious', type: 'prediction' },
  { text: 'Progress becomes visible.', category: 'work', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'Work flows in unusual directions.', category: 'work', deck: 'strange', type: 'warning' },
  { text: 'An unclear task confuses outcomes.', category: 'work', deck: 'strange', type: 'warning' },
  { text: 'Something feels off in your process.', category: 'work', deck: 'strange', type: 'warning' },

  { text: 'Adapt to unexpected changes.', category: 'work', deck: 'strange', type: 'advice' },
  { text: 'Trust unconventional solutions.', category: 'work', deck: 'strange', type: 'advice' },
  { text: 'Observe before acting.', category: 'work', deck: 'strange', type: 'advice' },

  { text: 'An unusual idea succeeds.', category: 'work', deck: 'strange', type: 'prediction' },
  { text: 'A hidden path opens.', category: 'work', deck: 'strange', type: 'prediction' },
  { text: 'A strange event benefits you.', category: 'work', deck: 'strange', type: 'prediction' },

  // 🔮 MYSTERY
  // FUNNY
  { text: 'The answer hides behind something obvious.', category: 'mystery', deck: 'funny', type: 'warning' },
  { text: 'Clues act like they’re on vacation.', category: 'mystery', deck: 'funny', type: 'warning' },
  { text: 'Nothing makes sense yet.', category: 'mystery', deck: 'funny', type: 'warning' },

  { text: 'Look again, but slower.', category: 'mystery', deck: 'funny', type: 'advice' },
  { text: 'Trust your weird instincts.', category: 'mystery', deck: 'funny', type: 'advice' },
  { text: 'Ask the obvious question.', category: 'mystery', deck: 'funny', type: 'advice' },

  { text: 'A clue appears at the right time.', category: 'mystery', deck: 'funny', type: 'prediction' },
  { text: 'Something clicks suddenly.', category: 'mystery', deck: 'funny', type: 'prediction' },
  { text: 'The mystery solves itself.', category: 'mystery', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'Information may be incomplete.', category: 'mystery', deck: 'serious', type: 'warning' },
  { text: 'Misinterpretation risks error.', category: 'mystery', deck: 'serious', type: 'warning' },
  { text: 'Patience is required for clarity.', category: 'mystery', deck: 'serious', type: 'warning' },

  { text: 'Analyze patterns carefully.', category: 'mystery', deck: 'serious', type: 'advice' },
  { text: 'Wait before concluding.', category: 'mystery', deck: 'serious', type: 'advice' },
  { text: 'Seek deeper understanding.', category: 'mystery', deck: 'serious', type: 'advice' },

  { text: 'Truth becomes clear soon.', category: 'mystery', deck: 'serious', type: 'prediction' },
  { text: 'A hidden element is revealed.', category: 'mystery', deck: 'serious', type: 'prediction' },
  { text: 'Clarity resolves confusion.', category: 'mystery', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'Reality feels slightly distorted.', category: 'mystery', deck: 'strange', type: 'warning' },
  { text: 'Signs point in conflicting ways.', category: 'mystery', deck: 'strange', type: 'warning' },
  { text: 'Not everything is meant to be known.', category: 'mystery', deck: 'strange', type: 'warning' },

  { text: 'Embrace the unknown.', category: 'mystery', deck: 'strange', type: 'advice' },
  { text: 'Let intuition guide interpretation.', category: 'mystery', deck: 'strange', type: 'advice' },
  { text: 'Accept ambiguity.', category: 'mystery', deck: 'strange', type: 'advice' },

  { text: 'A hidden truth emerges.', category: 'mystery', deck: 'strange', type: 'prediction' },
  { text: 'Reality reveals a deeper layer.', category: 'mystery', deck: 'strange', type: 'prediction' },
  { text: 'An answer comes from nowhere.', category: 'mystery', deck: 'strange', type: 'prediction' },

  // 🍀 LUCK
  // FUNNY
  { text: 'Luck forgot your address today.', category: 'luck', deck: 'funny', type: 'warning' },
  { text: 'A chance trips before reaching you.', category: 'luck', deck: 'funny', type: 'warning' },
  { text: 'Timing laughs at your plans.', category: 'luck', deck: 'funny', type: 'warning' },

  { text: 'Try anyway, luck likes effort.', category: 'luck', deck: 'funny', type: 'advice' },
  { text: 'Be ready, just in case.', category: 'luck', deck: 'funny', type: 'advice' },
  { text: 'Don’t blink, chances are shy.', category: 'luck', deck: 'funny', type: 'advice' },

  { text: 'A lucky moment surprises you.', category: 'luck', deck: 'funny', type: 'prediction' },
  { text: 'Something randomly goes right.', category: 'luck', deck: 'funny', type: 'prediction' },
  { text: 'Luck shows up late but works.', category: 'luck', deck: 'funny', type: 'prediction' },

  // SERIOUS
  { text: 'Opportunity may pass unnoticed.', category: 'luck', deck: 'serious', type: 'warning' },
  { text: 'Timing misalignment reduces chances.', category: 'luck', deck: 'serious', type: 'warning' },
  { text: 'Overreliance on luck is risky.', category: 'luck', deck: 'serious', type: 'warning' },

  { text: 'Prepare to meet opportunity.', category: 'luck', deck: 'serious', type: 'advice' },
  { text: 'Act with awareness and timing.', category: 'luck', deck: 'serious', type: 'advice' },
  { text: 'Recognize subtle chances.', category: 'luck', deck: 'serious', type: 'advice' },

  { text: 'A favorable moment arrives.', category: 'luck', deck: 'serious', type: 'prediction' },
  { text: 'Conditions align in your favor.', category: 'luck', deck: 'serious', type: 'prediction' },
  { text: 'A calculated risk pays off.', category: 'luck', deck: 'serious', type: 'prediction' },

  // STRANGE
  { text: 'Luck behaves unpredictably.', category: 'luck', deck: 'strange', type: 'warning' },
  { text: 'A strange chance may mislead.', category: 'luck', deck: 'strange', type: 'warning' },
  { text: 'Fortune moves in hidden ways.', category: 'luck', deck: 'strange', type: 'warning' },

  { text: 'Follow unusual opportunities.', category: 'luck', deck: 'strange', type: 'advice' },
  { text: 'Trust odd coincidences.', category: 'luck', deck: 'strange', type: 'advice' },
  { text: 'Stay open to randomness.', category: 'luck', deck: 'strange', type: 'advice' },

  { text: 'A strange coincidence benefits you.', category: 'luck', deck: 'strange', type: 'prediction' },
  { text: 'Luck appears from an unlikely source.', category: 'luck', deck: 'strange', type: 'prediction' },
  { text: 'Fortune bends reality slightly.', category: 'luck', deck: 'strange', type: 'prediction' },

]