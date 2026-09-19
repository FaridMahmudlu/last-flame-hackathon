import type { Clue, NumberSense, Position, Puzzle, Sense, Spot } from './types';

export const RULES = {
  initialFlame: 180_000,
  relaxedFlame: 300_000,
  maxFlame: 420_000,
  doorReward: 30_000,
  wrongCodeCost: 15_000,
  shareAmount: 20_000,
  echoCost: 20_000,
  rescueCost: 40_000,
  rescueFlame: 60_000,
  hauntInterval: 45_000,
  hauntCost: 10_000,
  codeCooldown: 1_500,
  signalCooldown: 800,
} as const;

export const SENSE_INFO: Record<Sense, { name: string; title: string; color: string; description: string; symbol: string }> = {
  sight: { name: 'Sight', title: 'The Observer', color: '#F1C27D', description: 'Notice what the house leaves in plain sight.', symbol: 'eye' },
  hearing: { name: 'Hearing', title: 'The Listener', color: '#91C7D7', description: 'Listen for the pattern beneath the silence.', symbol: 'ear' },
  reading: { name: 'Reading', title: 'The Archivist', color: '#C3A6DB', description: 'Read the words the house tried to hide.', symbol: 'book' },
  instinct: { name: 'Instinct', title: 'The Seeker', color: '#A3C5A0', description: 'Find the order that makes the pieces fit.', symbol: 'compass' },
};

export const SPOTS: Record<Spot, Position> = {
  entrance: { x: 0.49, y: 0.82 },
  sight: { x: 0.22, y: 0.43 },
  hearing: { x: 0.76, y: 0.34 },
  reading: { x: 0.77, y: 0.66 },
  instinct: { x: 0.24, y: 0.70 },
  door: { x: 0.49, y: 0.25 },
};

export const CHAPTERS = [
  {
    id: 'foyer', name: 'The Foyer', subtitle: 'Some doors remember who came before.', numeral: 'I',
    objective: 'Find three digits and the order. Unlock the library.',
    lore: 'The family left in a hurry. The house never did.',
    spots: { sight: 'Portrait gallery', hearing: 'The old telephone', reading: 'Covered mirror', instinct: 'Carved floor tiles' },
  },
  {
    id: 'library', name: 'The Library', subtitle: 'Every secret has a place on the shelf.', numeral: 'II',
    objective: 'Piece together the forgotten catalogue. Open the cellar.',
    lore: 'A note in the margins reads: no one has to leave alone.',
    spots: { sight: 'The empty shelves', hearing: 'The mantel clock', reading: 'An open ledger', instinct: 'The brass compass' },
  },
  {
    id: 'cellar', name: 'The Cellar', subtitle: 'One last door. One last light.', numeral: 'III',
    objective: 'Restore the final combination. One escape saves everyone.',
    lore: 'The keeper was never guarding the house. It was waiting to be let out.',
    spots: { sight: 'Marked bottles', hearing: 'The water pipes', reading: 'An old shipping label', instinct: 'The exit mechanism' },
  },
] as const;

export const SIGNALS = {
  help: 'My flame is low. Could someone share a little light?',
  door: 'I am at the door. Send me your clues.',
  wait: 'Give me a moment. I am checking a clue.',
  ready: 'I have what we need. Let us open this door.',
} as const;

export function makePuzzles(seed: number): Puzzle[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return CHAPTERS.map(() => {
    const values = { sight: 2 + Math.floor(random() * 6), hearing: 2 + Math.floor(random() * 4), reading: 1 + Math.floor(random() * 8) };
    const order: NumberSense[] = ['sight', 'hearing', 'reading'];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { values, order, solution: order.map((sense) => values[sense]).join('') };
  });
}

export function clueFor(chapter: number, puzzle: Puzzle, sense: Sense): Clue {
  const info = SENSE_INFO[sense];
  const titles = CHAPTERS[chapter].spots;
  if (sense === 'instinct') {
    return { sense, title: titles[sense], symbol: info.symbol, order: [...puzzle.order], text: `The lock follows this order: ${puzzle.order.map((item) => SENSE_INFO[item].name).join(' → ')}.` };
  }
  const value = puzzle.values[sense];
  const text: Record<NumberSense, string[]> = {
    sight: [
      `${value} portraits still carry a golden seal. Count only the marked frames.`,
      `${value} books are missing from the marked shelf. Count the empty spaces.`,
      `${value} bottles carry the keeper's mark. Ignore the unmarked bottles.`,
    ],
    hearing: [
      `${value} knocks, then silence. The telephone repeats the same pattern.`,
      `The clock strikes ${value} times before its hands stop.`,
      `${value} clear taps travel through the pipe. Then the water falls silent.`,
    ],
    reading: [
      `The mirrored inscription reads 184${value}. The last digit is the one you need.`,
      `The ledger's final entry is No. 27${value}. Take its last digit.`,
      `The shipping label reads CRATE 9${value}. Keep only its final digit.`,
    ],
  };
  return { sense, title: titles[sense], text: text[sense][chapter], value, symbol: info.symbol };
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
