import { hashString } from './revelationRng'

export const REPEAT_PROMPT_OPTIONS = [
  'Shall we look deeper?',
  'Would you dare to know more?',
  'The cards still whisper… shall I listen?',
  'There is more to uncover… will you hear it?',
  'Do you wish me to go on?',
  'Another thread awaits… shall I pull it?',
  'The veil has not fully lifted… continue?',
  'I can see further… if you allow it.',
  'The future stirs again… shall I reveal it?',
  'One more glimpse… do you seek it?'
] as const

export function repeatPromptForSeed(seed: string): string {
  const lines = REPEAT_PROMPT_OPTIONS
  return lines[hashString(seed) % lines.length]!
}
