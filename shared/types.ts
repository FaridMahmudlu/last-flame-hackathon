export const SENSES = ['sight', 'hearing', 'reading', 'instinct'] as const;
export type Sense = (typeof SENSES)[number];
export type NumberSense = Exclude<Sense, 'instinct'>;
export type Phase = 'lobby' | 'playing' | 'won' | 'lost';
export type Spot = Sense | 'entrance' | 'door';
export type Difficulty = 'standard' | 'relaxed';
export type Signal = 'help' | 'door' | 'wait' | 'ready';
export type Position = { x: number; y: number };
export type Motion = { from: Position; to: Position; startedAt: number; endsAt: number };
export type Stats = { shared: number; echoes: number; rescued: number; doors: number; clues: number };
export type Puzzle = { values: Record<NumberSense, number>; order: NumberSense[]; solution: string };
export type Clue = { sense: Sense; title: string; text: string; value?: number; order?: NumberSense[]; symbol: string };
export type Player = {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  ready: boolean;
  status: 'alive' | 'captured';
  expiresAt: number;
  capturedAt: number | null;
  senses: Sense[];
  spot: Spot;
  motion: Motion;
  discovered: Record<number, Sense[]>;
  echoes: Record<number, Sense[]>;
  stats: Stats;
  lastAttemptAt: number;
  lastSignalAt: number;
};
export type GameEvent = { id: number; kind: 'info' | 'clue' | 'danger' | 'success'; text: string; at: number; playerId?: string };
export type Game = {
  code: string;
  hostId: string;
  phase: Phase;
  difficulty: Difficulty;
  practice: boolean;
  seed: number;
  round: number;
  revision: number;
  players: Player[];
  puzzles: Puzzle[];
  chapter: number;
  startedAt: number | null;
  endedAt: number | null;
  nextHauntAt: number;
  lastHauntAt: number | null;
  rescueUsed: boolean;
  events: GameEvent[];
  updatedAt: number;
};
export type PublicPlayer = Pick<Player, 'id' | 'name' | 'seat' | 'connected' | 'ready' | 'status' | 'expiresAt' | 'senses' | 'spot' | 'motion' | 'stats'>;
export type GameView = {
  code: string;
  hostId: string;
  phase: Phase;
  difficulty: Difficulty;
  practice: boolean;
  round: number;
  revision: number;
  chapter: number;
  players: PublicPlayer[];
  youId: string;
  clues: Clue[];
  availableEchoes: Sense[];
  rescueUsed: boolean;
  startedAt: number | null;
  endedAt: number | null;
  nextHauntAt: number;
  lastHauntAt: number | null;
  serverNow: number;
  events: GameEvent[];
};
export type GameAction =
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'move'; spot: Spot; chapter: number }
  | { type: 'inspect'; sense: Sense; chapter: number }
  | { type: 'solve'; code: string; chapter: number }
  | { type: 'echo'; sense: Sense; chapter: number }
  | { type: 'share'; targetId: string }
  | { type: 'rescue'; targetId: string }
  | { type: 'signal'; signal: Signal }
  | { type: 'share-clue'; sense: Sense; chapter: number }
  | { type: 'restart' };
export type ActionResult = { ok: true } | { ok: false; error: string };
export type Session = { code: string; playerId: string; token: string; server: string };
export type ClientMessage =
  | { type: 'create'; requestId: string; name: string; difficulty: Difficulty }
  | { type: 'join'; requestId: string; name: string; code: string }
  | { type: 'resume'; requestId: string; code: string; playerId: string; token: string }
  | { type: 'action'; requestId: string; round: number; action: GameAction }
  | { type: 'leave'; requestId: string };
export type ServerMessage =
  | { type: 'welcome'; requestId: string; session: Omit<Session, 'server'>; view: GameView }
  | { type: 'state'; view: GameView }
  | { type: 'ack'; requestId: string; ok: boolean; error?: string }
  | { type: 'error'; requestId?: string; error: string };
