import type { Fortune } from './types'

export const FORTUNES: Fortune[] = [

  // ❤️ LOVE
  { text: 'Love may rush faster than you.', category: 'love', type: 'advertencia' },
  { text: 'Mixed signals could confuse your heart.', category: 'love', type: 'advertencia' },
  { text: 'Old feelings might unexpectedly return today.', category: 'love', type: 'advertencia' },
  { text: 'Too much dreaming hides real intentions.', category: 'love', type: 'advertencia' },
  { text: 'Someone charming may not be clear.', category: 'love', type: 'advertencia' },

  { text: 'Speak honestly, love prefers simple truths.', category: 'love', type: 'consejo' },
  { text: 'Give space, hearts grow without pressure.', category: 'love', type: 'consejo' },
  { text: 'Listen closely, feelings hide between words.', category: 'love', type: 'consejo' },
  { text: 'Small gestures carry more meaning today.', category: 'love', type: 'consejo' },
  { text: 'Be patient, love enjoys taking its time.', category: 'love', type: 'consejo' },

  { text: 'A sweet message arrives when least expected.', category: 'love', type: 'prediccion' },
  { text: 'Someone new notices you very soon.', category: 'love', type: 'prediccion' },
  { text: 'A connection deepens quietly over time.', category: 'love', type: 'prediccion' },
  { text: 'Love returns in a familiar shape.', category: 'love', type: 'prediccion' },
  { text: 'A smile sparks something meaningful soon.', category: 'love', type: 'prediccion' },

  // 💰 MONEY
  { text: 'Quick spending may undo recent progress.', category: 'money', type: 'advertencia' },
  { text: 'A tempting deal hides small details.', category: 'money', type: 'advertencia' },
  { text: 'Patience tested by slow financial movement.', category: 'money', type: 'advertencia' },
  { text: 'Unexpected costs may appear quietly today.', category: 'money', type: 'advertencia' },
  { text: 'Overconfidence could blur smart decisions.', category: 'money', type: 'advertencia' },

  { text: 'Track expenses, numbers tell honest stories.', category: 'money', type: 'consejo' },
  { text: 'Small savings build surprisingly fast.', category: 'money', type: 'consejo' },
  { text: 'Pause before spending, clarity follows.', category: 'money', type: 'consejo' },
  { text: 'Value consistency over quick wins.', category: 'money', type: 'consejo' },
  { text: 'Plan ahead, future you feels grateful.', category: 'money', type: 'consejo' },

  { text: 'A small gain arrives unexpectedly soon.', category: 'money', type: 'prediccion' },
  { text: 'A new opportunity improves your income.', category: 'money', type: 'prediccion' },
  { text: 'Money flows back after recent effort.', category: 'money', type: 'prediccion' },
  { text: 'A helpful contact boosts your finances.', category: 'money', type: 'prediccion' },
  { text: 'Your patience turns into a reward.', category: 'money', type: 'prediccion' },

  // 🧘 HEALTH
  { text: 'Ignoring rest may slow your recovery.', category: 'health', type: 'advertencia' },
  { text: 'Low energy signals need quiet attention.', category: 'health', type: 'advertencia' },
  { text: 'Stress builds faster than you notice.', category: 'health', type: 'advertencia' },
  { text: 'Small habits might affect your balance.', category: 'health', type: 'advertencia' },
  { text: 'Pushing too hard delays steady progress.', category: 'health', type: 'advertencia' },

  { text: 'Drink water, your body thanks you.', category: 'health', type: 'consejo' },
  { text: 'Move gently, consistency beats intensity.', category: 'health', type: 'consejo' },
  { text: 'Take breaks, clarity returns with rest.', category: 'health', type: 'consejo' },
  { text: 'Listen inward, your body knows timing.', category: 'health', type: 'consejo' },
  { text: 'Sleep well, tomorrow improves quietly.', category: 'health', type: 'consejo' },

  { text: 'Your energy lifts sooner than expected.', category: 'health', type: 'prediccion' },
  { text: 'A calm moment restores inner balance.', category: 'health', type: 'prediccion' },
  { text: 'Strength grows steadily from within.', category: 'health', type: 'prediccion' },
  { text: 'A fresh routine brings better vitality.', category: 'health', type: 'prediccion' },
  { text: 'Peaceful energy surrounds you very soon.', category: 'health', type: 'prediccion' },

  // 💼 WORK
  { text: 'Rushing tasks may create extra work.', category: 'work', type: 'advertencia' },
  { text: 'A detail overlooked could matter later.', category: 'work', type: 'advertencia' },
  { text: 'Too many goals scatter your focus.', category: 'work', type: 'advertencia' },
  { text: 'Waiting too long delays good opportunities.', category: 'work', type: 'advertencia' },
  { text: 'Distractions may quietly slow your progress.', category: 'work', type: 'advertencia' },

  { text: 'Prioritize wisely, results follow faster.', category: 'work', type: 'consejo' },
  { text: 'Ask questions, clarity saves time later.', category: 'work', type: 'consejo' },
  { text: 'Focus deeply, quality stands out naturally.', category: 'work', type: 'consejo' },
  { text: 'Take initiative, doors respond quickly.', category: 'work', type: 'consejo' },
  { text: 'Keep learning, growth compounds over time.', category: 'work', type: 'consejo' },

  { text: 'A new role becomes visible soon.', category: 'work', type: 'prediccion' },
  { text: 'Recognition arrives after steady effort.', category: 'work', type: 'prediccion' },
  { text: 'A project opens unexpected possibilities.', category: 'work', type: 'prediccion' },
  { text: 'Your work gains attention in silence.', category: 'work', type: 'prediccion' },
  { text: 'A useful connection appears at right time.', category: 'work', type: 'prediccion' },

  // 🔮 MYSTERY
  { text: 'Not every sign reveals truth immediately.', category: 'mystery', type: 'advertencia' },
  { text: 'A clue may mislead without context.', category: 'mystery', type: 'advertencia' },
  { text: 'Rushing answers hides deeper meanings.', category: 'mystery', type: 'advertencia' },
  { text: 'Silence may carry more than words.', category: 'mystery', type: 'advertencia' },
  { text: 'Some truths prefer waiting a little longer.', category: 'mystery', type: 'advertencia' },

  { text: 'Observe patterns, they whisper useful hints.', category: 'mystery', type: 'consejo' },
  { text: 'Trust intuition, it connects unseen pieces.', category: 'mystery', type: 'consejo' },
  { text: 'Look twice, details enjoy hiding softly.', category: 'mystery', type: 'consejo' },
  { text: 'Stay curious, answers like patient minds.', category: 'mystery', type: 'consejo' },
  { text: 'Pause often, insight arrives in stillness.', category: 'mystery', type: 'consejo' },

  { text: 'A hidden detail becomes clear very soon.', category: 'mystery', type: 'prediccion' },
  { text: 'An answer appears when you least expect.', category: 'mystery', type: 'prediccion' },
  { text: 'A pattern reveals itself through repetition.', category: 'mystery', type: 'prediccion' },
  { text: 'Something lost returns in another form.', category: 'mystery', type: 'prediccion' },
  { text: 'The truth surfaces gently and unexpectedly.', category: 'mystery', type: 'prediccion' },

  // 🍀 LUCK
  { text: 'Relying only on luck may disappoint.', category: 'luck', type: 'advertencia' },
  { text: 'A good chance might pass unnoticed.', category: 'luck', type: 'advertencia' },
  { text: 'Timing matters more than excitement today.', category: 'luck', type: 'advertencia' },
  { text: 'Too much waiting weakens lucky momentum.', category: 'luck', type: 'advertencia' },
  { text: 'A risky move may feel better than is.', category: 'luck', type: 'advertencia' },

  { text: 'Take chances, but read the moment.', category: 'luck', type: 'consejo' },
  { text: 'Stay ready, luck favors prepared minds.', category: 'luck', type: 'consejo' },
  { text: 'Act lightly, not every chance needs force.', category: 'luck', type: 'consejo' },
  { text: 'Notice small signs, they guide better paths.', category: 'luck', type: 'consejo' },
  { text: 'Keep moving, luck meets those in motion.', category: 'luck', type: 'consejo' },

  { text: 'A lucky break appears at the right moment.', category: 'luck', type: 'prediccion' },
  { text: 'A small risk brings a pleasant surprise.', category: 'luck', type: 'prediccion' },
  { text: 'Your timing aligns with a good opportunity.', category: 'luck', type: 'prediccion' },
  { text: 'A coincidence works strongly in your favor.', category: 'luck', type: 'prediccion' },
  { text: 'Luck quietly improves your current path.', category: 'luck', type: 'prediccion' }

]