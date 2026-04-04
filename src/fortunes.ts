import type { Fortune } from './types'

export const FORTUNES: Fortune[] = [

  // ❤️ LOVE
  // FUNNY
  { text: 'Love trips over its own feet today.', category: 'love', deck: 'funny', type: 'advertencia' },
  { text: 'Romance may act a bit dramatic.', category: 'love', deck: 'funny', type: 'advertencia' },
  { text: 'Someone flirts like a confused cat.', category: 'love', deck: 'funny', type: 'advertencia' },

  { text: 'Laugh first, love figures itself out.', category: 'love', deck: 'funny', type: 'consejo' },
  { text: 'Don’t overthink, just enjoy the chaos.', category: 'love', deck: 'funny', type: 'consejo' },
  { text: 'Smile more, it’s oddly effective.', category: 'love', deck: 'funny', type: 'consejo' },

  { text: 'A silly moment turns into something sweet.', category: 'love', deck: 'funny', type: 'prediccion' },
  { text: 'Someone laughs at your worst joke.', category: 'love', deck: 'funny', type: 'prediccion' },
  { text: 'Romance appears in an unexpected meme.', category: 'love', deck: 'funny', type: 'prediccion' },

  // SERIOUS
  { text: 'Unspoken feelings may create distance.', category: 'love', deck: 'serious', type: 'advertencia' },
  { text: 'Emotional imbalance needs attention.', category: 'love', deck: 'serious', type: 'advertencia' },
  { text: 'Past wounds may resurface quietly.', category: 'love', deck: 'serious', type: 'advertencia' },

  { text: 'Communicate clearly and without fear.', category: 'love', deck: 'serious', type: 'consejo' },
  { text: 'Respect boundaries, yours and theirs.', category: 'love', deck: 'serious', type: 'consejo' },
  { text: 'Let actions align with your intentions.', category: 'love', deck: 'serious', type: 'consejo' },

  { text: 'A meaningful connection deepens.', category: 'love', deck: 'serious', type: 'prediccion' },
  { text: 'Clarity arrives in your relationships.', category: 'love', deck: 'serious', type: 'prediccion' },
  { text: 'A decision strengthens your bond.', category: 'love', deck: 'serious', type: 'prediccion' },

  // STRANGE
  { text: 'Love hides behind unusual signals.', category: 'love', deck: 'strange', type: 'advertencia' },
  { text: 'Dreams may blur emotional truth.', category: 'love', deck: 'strange', type: 'advertencia' },
  { text: 'A connection feels oddly familiar.', category: 'love', deck: 'strange', type: 'advertencia' },

  { text: 'Follow the feeling, not the logic.', category: 'love', deck: 'strange', type: 'consejo' },
  { text: 'Let mystery guide your heart.', category: 'love', deck: 'strange', type: 'consejo' },
  { text: 'Accept what cannot be explained.', category: 'love', deck: 'strange', type: 'consejo' },

  { text: 'A surreal encounter changes everything.', category: 'love', deck: 'strange', type: 'prediccion' },
  { text: 'Love appears in an impossible way.', category: 'love', deck: 'strange', type: 'prediccion' },
  { text: 'A dream reveals hidden feelings.', category: 'love', deck: 'strange', type: 'prediccion' },

  // 💰 MONEY
  // FUNNY
  { text: 'Your wallet feels lighter than usual.', category: 'money', deck: 'funny', type: 'advertencia' },
  { text: 'A bad deal smiles too much.', category: 'money', deck: 'funny', type: 'advertencia' },
  { text: 'Money disappears like magic.', category: 'money', deck: 'funny', type: 'advertencia' },

  { text: 'Count twice, spend once.', category: 'money', deck: 'funny', type: 'consejo' },
  { text: 'Don’t trust shiny discounts.', category: 'money', deck: 'funny', type: 'consejo' },
  { text: 'Save like a paranoid squirrel.', category: 'money', deck: 'funny', type: 'consejo' },

  { text: 'A random gain surprises you.', category: 'money', deck: 'funny', type: 'prediccion' },
  { text: 'Coins align in your favor.', category: 'money', deck: 'funny', type: 'prediccion' },
  { text: 'Money returns from nowhere.', category: 'money', deck: 'funny', type: 'prediccion' },

  // SERIOUS
  { text: 'Financial pressure may increase.', category: 'money', deck: 'serious', type: 'advertencia' },
  { text: 'A decision carries long-term impact.', category: 'money', deck: 'serious', type: 'advertencia' },
  { text: 'Overconfidence risks stability.', category: 'money', deck: 'serious', type: 'advertencia' },

  { text: 'Plan with discipline and foresight.', category: 'money', deck: 'serious', type: 'consejo' },
  { text: 'Control spending habits carefully.', category: 'money', deck: 'serious', type: 'consejo' },
  { text: 'Think long-term, not immediate.', category: 'money', deck: 'serious', type: 'consejo' },

  { text: 'Income stabilizes gradually.', category: 'money', deck: 'serious', type: 'prediccion' },
  { text: 'A solid opportunity appears.', category: 'money', deck: 'serious', type: 'prediccion' },
  { text: 'Effort translates into profit.', category: 'money', deck: 'serious', type: 'prediccion' },

  // STRANGE
  { text: 'Money flows in unpredictable patterns.', category: 'money', deck: 'strange', type: 'advertencia' },
  { text: 'A strange deal hides meaning.', category: 'money', deck: 'strange', type: 'advertencia' },
  { text: 'Numbers feel oddly symbolic.', category: 'money', deck: 'strange', type: 'advertencia' },

  { text: 'Trust unusual opportunities carefully.', category: 'money', deck: 'strange', type: 'consejo' },
  { text: 'Follow intuition in transactions.', category: 'money', deck: 'strange', type: 'consejo' },
  { text: 'Patterns reveal financial paths.', category: 'money', deck: 'strange', type: 'consejo' },

  { text: 'A hidden source brings income.', category: 'money', deck: 'strange', type: 'prediccion' },
  { text: 'An odd event improves finances.', category: 'money', deck: 'strange', type: 'prediccion' },
  { text: 'Wealth appears through coincidence.', category: 'money', deck: 'strange', type: 'prediccion' },

  // 🧘 HEALTH
  // FUNNY
  { text: 'Your body asks for a nap loudly.', category: 'health', deck: 'funny', type: 'advertencia' },
  { text: 'Energy leaks like a bad battery.', category: 'health', deck: 'funny', type: 'advertencia' },
  { text: 'Too much effort, not enough snacks.', category: 'health', deck: 'funny', type: 'advertencia' },

  { text: 'Drink water like it’s a quest.', category: 'health', deck: 'funny', type: 'consejo' },
  { text: 'Stretch like a lazy cat.', category: 'health', deck: 'funny', type: 'consejo' },
  { text: 'Rest counts as productivity today.', category: 'health', deck: 'funny', type: 'consejo' },

  { text: 'Energy returns after a good rest.', category: 'health', deck: 'funny', type: 'prediccion' },
  { text: 'A snack improves your entire mood.', category: 'health', deck: 'funny', type: 'prediccion' },
  { text: 'You feel better out of nowhere.', category: 'health', deck: 'funny', type: 'prediccion' },

  // SERIOUS
  { text: 'Ignoring signals may delay recovery.', category: 'health', deck: 'serious', type: 'advertencia' },
  { text: 'Stress builds beneath the surface.', category: 'health', deck: 'serious', type: 'advertencia' },
  { text: 'Balance is currently unstable.', category: 'health', deck: 'serious', type: 'advertencia' },

  { text: 'Prioritize rest and recovery.', category: 'health', deck: 'serious', type: 'consejo' },
  { text: 'Maintain consistent routines.', category: 'health', deck: 'serious', type: 'consejo' },
  { text: 'Listen to your body carefully.', category: 'health', deck: 'serious', type: 'consejo' },

  { text: 'Your condition improves steadily.', category: 'health', deck: 'serious', type: 'prediccion' },
  { text: 'Strength returns with discipline.', category: 'health', deck: 'serious', type: 'prediccion' },
  { text: 'Balance is restored soon.', category: 'health', deck: 'serious', type: 'prediccion' },

  // STRANGE
  { text: 'Energy shifts feel unpredictable.', category: 'health', deck: 'strange', type: 'advertencia' },
  { text: 'Your body reacts in unusual ways.', category: 'health', deck: 'strange', type: 'advertencia' },
  { text: 'A hidden imbalance emerges.', category: 'health', deck: 'strange', type: 'advertencia' },

  { text: 'Follow subtle internal signals.', category: 'health', deck: 'strange', type: 'consejo' },
  { text: 'Let intuition guide your rhythm.', category: 'health', deck: 'strange', type: 'consejo' },
  { text: 'Slow down to understand changes.', category: 'health', deck: 'strange', type: 'consejo' },

  { text: 'A strange calm restores you.', category: 'health', deck: 'strange', type: 'prediccion' },
  { text: 'Healing comes unexpectedly.', category: 'health', deck: 'strange', type: 'prediccion' },
  { text: 'Your energy realigns suddenly.', category: 'health', deck: 'strange', type: 'prediccion' },

  // 💼 WORK
  // FUNNY
  { text: 'Your brain opens 20 tabs at once.', category: 'work', deck: 'funny', type: 'advertencia' },
  { text: 'Focus escapes like a ninja.', category: 'work', deck: 'funny', type: 'advertencia' },
  { text: 'Deadlines stare at you menacingly.', category: 'work', deck: 'funny', type: 'advertencia' },

  { text: 'Do one thing, not everything.', category: 'work', deck: 'funny', type: 'consejo' },
  { text: 'Coffee is not a strategy.', category: 'work', deck: 'funny', type: 'consejo' },
  { text: 'Finish before starting new chaos.', category: 'work', deck: 'funny', type: 'consejo' },

  { text: 'A task finishes faster than expected.', category: 'work', deck: 'funny', type: 'prediccion' },
  { text: 'You accidentally do something right.', category: 'work', deck: 'funny', type: 'prediccion' },
  { text: 'A random idea works perfectly.', category: 'work', deck: 'funny', type: 'prediccion' },

  // SERIOUS
  { text: 'Lack of focus reduces quality.', category: 'work', deck: 'serious', type: 'advertencia' },
  { text: 'A missed detail may escalate.', category: 'work', deck: 'serious', type: 'advertencia' },
  { text: 'Delays impact your progress.', category: 'work', deck: 'serious', type: 'advertencia' },

  { text: 'Prioritize tasks strategically.', category: 'work', deck: 'serious', type: 'consejo' },
  { text: 'Maintain discipline and consistency.', category: 'work', deck: 'serious', type: 'consejo' },
  { text: 'Communicate expectations clearly.', category: 'work', deck: 'serious', type: 'consejo' },

  { text: 'Recognition follows effort.', category: 'work', deck: 'serious', type: 'prediccion' },
  { text: 'A new opportunity arises.', category: 'work', deck: 'serious', type: 'prediccion' },
  { text: 'Progress becomes visible.', category: 'work', deck: 'serious', type: 'prediccion' },

  // STRANGE
  { text: 'Work flows in unusual directions.', category: 'work', deck: 'strange', type: 'advertencia' },
  { text: 'An unclear task confuses outcomes.', category: 'work', deck: 'strange', type: 'advertencia' },
  { text: 'Something feels off in your process.', category: 'work', deck: 'strange', type: 'advertencia' },

  { text: 'Adapt to unexpected changes.', category: 'work', deck: 'strange', type: 'consejo' },
  { text: 'Trust unconventional solutions.', category: 'work', deck: 'strange', type: 'consejo' },
  { text: 'Observe before acting.', category: 'work', deck: 'strange', type: 'consejo' },

  { text: 'An unusual idea succeeds.', category: 'work', deck: 'strange', type: 'prediccion' },
  { text: 'A hidden path opens.', category: 'work', deck: 'strange', type: 'prediccion' },
  { text: 'A strange event benefits you.', category: 'work', deck: 'strange', type: 'prediccion' },

  // 🔮 MYSTERY
  // FUNNY
  { text: 'The answer hides behind something obvious.', category: 'mystery', deck: 'funny', type: 'advertencia' },
  { text: 'Clues act like they’re on vacation.', category: 'mystery', deck: 'funny', type: 'advertencia' },
  { text: 'Nothing makes sense yet.', category: 'mystery', deck: 'funny', type: 'advertencia' },

  { text: 'Look again, but slower.', category: 'mystery', deck: 'funny', type: 'consejo' },
  { text: 'Trust your weird instincts.', category: 'mystery', deck: 'funny', type: 'consejo' },
  { text: 'Ask the obvious question.', category: 'mystery', deck: 'funny', type: 'consejo' },

  { text: 'A clue appears at the right time.', category: 'mystery', deck: 'funny', type: 'prediccion' },
  { text: 'Something clicks suddenly.', category: 'mystery', deck: 'funny', type: 'prediccion' },
  { text: 'The mystery solves itself.', category: 'mystery', deck: 'funny', type: 'prediccion' },

  // SERIOUS
  { text: 'Information may be incomplete.', category: 'mystery', deck: 'serious', type: 'advertencia' },
  { text: 'Misinterpretation risks error.', category: 'mystery', deck: 'serious', type: 'advertencia' },
  { text: 'Patience is required for clarity.', category: 'mystery', deck: 'serious', type: 'advertencia' },

  { text: 'Analyze patterns carefully.', category: 'mystery', deck: 'serious', type: 'consejo' },
  { text: 'Wait before concluding.', category: 'mystery', deck: 'serious', type: 'consejo' },
  { text: 'Seek deeper understanding.', category: 'mystery', deck: 'serious', type: 'consejo' },

  { text: 'Truth becomes clear soon.', category: 'mystery', deck: 'serious', type: 'prediccion' },
  { text: 'A hidden element is revealed.', category: 'mystery', deck: 'serious', type: 'prediccion' },
  { text: 'Clarity resolves confusion.', category: 'mystery', deck: 'serious', type: 'prediccion' },

  // STRANGE
  { text: 'Reality feels slightly distorted.', category: 'mystery', deck: 'strange', type: 'advertencia' },
  { text: 'Signs point in conflicting ways.', category: 'mystery', deck: 'strange', type: 'advertencia' },
  { text: 'Not everything is meant to be known.', category: 'mystery', deck: 'strange', type: 'advertencia' },

  { text: 'Embrace the unknown.', category: 'mystery', deck: 'strange', type: 'consejo' },
  { text: 'Let intuition guide interpretation.', category: 'mystery', deck: 'strange', type: 'consejo' },
  { text: 'Accept ambiguity.', category: 'mystery', deck: 'strange', type: 'consejo' },

  { text: 'A hidden truth emerges.', category: 'mystery', deck: 'strange', type: 'prediccion' },
  { text: 'Reality reveals a deeper layer.', category: 'mystery', deck: 'strange', type: 'prediccion' },
  { text: 'An answer comes from nowhere.', category: 'mystery', deck: 'strange', type: 'prediccion' },

  // 🍀 LUCK
  // FUNNY
  { text: 'Luck forgot your address today.', category: 'luck', deck: 'funny', type: 'advertencia' },
  { text: 'A chance trips before reaching you.', category: 'luck', deck: 'funny', type: 'advertencia' },
  { text: 'Timing laughs at your plans.', category: 'luck', deck: 'funny', type: 'advertencia' },

  { text: 'Try anyway, luck likes effort.', category: 'luck', deck: 'funny', type: 'consejo' },
  { text: 'Be ready, just in case.', category: 'luck', deck: 'funny', type: 'consejo' },
  { text: 'Don’t blink, chances are shy.', category: 'luck', deck: 'funny', type: 'consejo' },

  { text: 'A lucky moment surprises you.', category: 'luck', deck: 'funny', type: 'prediccion' },
  { text: 'Something randomly goes right.', category: 'luck', deck: 'funny', type: 'prediccion' },
  { text: 'Luck shows up late but works.', category: 'luck', deck: 'funny', type: 'prediccion' },

  // SERIOUS
  { text: 'Opportunity may pass unnoticed.', category: 'luck', deck: 'serious', type: 'advertencia' },
  { text: 'Timing misalignment reduces chances.', category: 'luck', deck: 'serious', type: 'advertencia' },
  { text: 'Overreliance on luck is risky.', category: 'luck', deck: 'serious', type: 'advertencia' },

  { text: 'Prepare to meet opportunity.', category: 'luck', deck: 'serious', type: 'consejo' },
  { text: 'Act with awareness and timing.', category: 'luck', deck: 'serious', type: 'consejo' },
  { text: 'Recognize subtle chances.', category: 'luck', deck: 'serious', type: 'consejo' },

  { text: 'A favorable moment arrives.', category: 'luck', deck: 'serious', type: 'prediccion' },
  { text: 'Conditions align in your favor.', category: 'luck', deck: 'serious', type: 'prediccion' },
  { text: 'A calculated risk pays off.', category: 'luck', deck: 'serious', type: 'prediccion' },

  // STRANGE
  { text: 'Luck behaves unpredictably.', category: 'luck', deck: 'strange', type: 'advertencia' },
  { text: 'A strange chance may mislead.', category: 'luck', deck: 'strange', type: 'advertencia' },
  { text: 'Fortune moves in hidden ways.', category: 'luck', deck: 'strange', type: 'advertencia' },

  { text: 'Follow unusual opportunities.', category: 'luck', deck: 'strange', type: 'consejo' },
  { text: 'Trust odd coincidences.', category: 'luck', deck: 'strange', type: 'consejo' },
  { text: 'Stay open to randomness.', category: 'luck', deck: 'strange', type: 'consejo' },

  { text: 'A strange coincidence benefits you.', category: 'luck', deck: 'strange', type: 'prediccion' },
  { text: 'Luck appears from an unlikely source.', category: 'luck', deck: 'strange', type: 'prediccion' },
  { text: 'Fortune bends reality slightly.', category: 'luck', deck: 'strange', type: 'prediccion' },

]