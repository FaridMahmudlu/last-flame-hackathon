import { CHAPTERS, RULES, SIGNALS, SPOTS, clueFor, makePuzzles } from './content';
import { SENSES } from './types';
import type { ActionResult, Difficulty, Game, GameAction, GameEvent, GameView, Player, Sense, Spot } from './types';

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });
const stats = () => ({ shared: 0, echoes: 0, rescued: 0, doors: 0, clues: 0 });
const still = (spot: Spot, now: number) => ({ from: { ...SPOTS[spot] }, to: { ...SPOTS[spot] }, startedAt: now, endsAt: now });

export function remaining(player: Pick<Player, 'status' | 'expiresAt'>, now: number): number {
  return player.status === 'alive' ? Math.max(0, player.expiresAt - now) : 0;
}

function note(game: Game, kind: GameEvent['kind'], text: string, now: number, playerId?: string) {
  game.revision++;
  game.updatedAt = now;
  game.events.push({ id: game.revision, kind, text, at: now, ...(playerId ? { playerId } : {}) });
  if (game.events.length > 24) game.events.shift();
}

function distributeSenses(game: Game) {
  game.players.forEach((player) => { player.senses = []; });
  if (!game.players.length) return;
  SENSES.forEach((sense, index) => { game.players[index % game.players.length].senses.push(sense); });
}

export function createGame(code: string, seed: number, now: number, difficulty: Difficulty = 'standard', practice = false): Game {
  return { code, seed, hostId: '', phase: 'lobby', difficulty, practice, round: 0, revision: 0, players: [], puzzles: makePuzzles(seed), chapter: 0, startedAt: null, endedAt: null, nextHauntAt: 0, lastHauntAt: null, rescueUsed: false, events: [], updatedAt: now };
}

export function addPlayer(game: Game, id: string, name: string, now: number): ActionResult {
  if (game.phase !== 'lobby') return fail('This escape has already begun. Wait for the next round.');
  if (game.players.length >= 4) return fail('This room already has four explorers.');
  if (game.players.some((player) => player.id === id)) return fail('You are already in this room.');
  const cleanName = name.trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} ._-]{2,18}$/u.test(cleanName)) return fail('Use 2–18 letters, numbers, spaces, or simple punctuation for your name.');
  const seat = [0, 1, 2, 3].find((number) => !game.players.some((player) => player.seat === number))!;
  game.players.push({ id, name: cleanName, seat, connected: true, ready: false, status: 'alive', expiresAt: 0, capturedAt: null, senses: [], spot: 'entrance', motion: still('entrance', now), discovered: {}, echoes: {}, stats: stats(), lastAttemptAt: -Infinity, lastSignalAt: -Infinity });
  if (!game.hostId) game.hostId = id;
  distributeSenses(game);
  note(game, 'info', `${cleanName} joined the circle.`, now, id);
  return ok;
}

export function setConnected(game: Game, id: string, connected: boolean, now: number) {
  const player = game.players.find((item) => item.id === id);
  if (!player || player.connected === connected) return;
  player.connected = connected;
  if (!connected && game.phase === 'lobby') player.ready = false;
  if (!game.players.some((item) => item.id === game.hostId && item.connected)) {
    game.hostId = game.players.find((item) => item.connected)?.id ?? game.hostId;
  }
  note(game, 'info', connected ? `${player.name} is back with the team.` : `${player.name} is reconnecting. Their senses can be borrowed.`, now, id);
}

export function removePlayer(game: Game, id: string, now: number) {
  const player = game.players.find((item) => item.id === id);
  if (!player) return;
  if (game.phase === 'lobby') {
    game.players = game.players.filter((item) => item.id !== id);
    distributeSenses(game);
  } else {
    player.connected = false;
    player.status = 'captured';
    player.capturedAt = now;
    player.expiresAt = now;
  }
  if (game.hostId === id) game.hostId = game.players.find((item) => item.connected)?.id ?? '';
  note(game, 'info', `${player.name} left the circle.`, now, id);
  settleCaptures(game, now);
}

function settleCaptures(game: Game, now: number) {
  if (game.phase !== 'playing') return;
  for (const player of game.players) {
    if (player.status === 'alive' && player.expiresAt <= now) {
      player.status = 'captured';
      player.capturedAt = now;
      note(game, 'danger', `${player.name}'s flame went out. The mist has found them.`, now, player.id);
    }
  }
  if (!game.players.some((player) => player.status === 'alive')) {
    game.phase = 'lost';
    game.endedAt = now;
    note(game, 'danger', 'The last flame faded. The house keeps its secrets tonight.', now);
  }
}

export function advanceGame(game: Game, now: number): boolean {
  const revision = game.revision;
  while (game.phase === 'playing') {
    const alive = game.players.filter((player) => player.status === 'alive');
    if (!alive.length) { settleCaptures(game, now); break; }
    const nextExpiry = Math.min(...alive.map((player) => player.expiresAt));
    const eventAt = Math.min(nextExpiry, game.nextHauntAt);
    if (eventAt > now) break;
    settleCaptures(game, eventAt);
    if (game.phase !== 'playing') break;
    if (game.nextHauntAt <= eventAt) {
      const weakest = game.players.filter((player) => player.status === 'alive').sort((a, b) => a.expiresAt - b.expiresAt || a.seat - b.seat)[0];
      weakest.expiresAt -= RULES.hauntCost;
      game.lastHauntAt = eventAt;
      game.nextHauntAt += RULES.hauntInterval;
      note(game, 'danger', `The mist brushed past ${weakest.name}. 10 seconds of light were lost.`, eventAt, weakest.id);
      settleCaptures(game, eventAt);
    }
  }
  return game.revision !== revision;
}

function hasSense(game: Game, player: Player, sense: Sense) {
  return player.senses.includes(sense) || (player.echoes[game.chapter] ?? []).includes(sense);
}

function canBorrow(game: Game, sense: Sense) {
  return !game.players.some((player) => player.connected && player.status === 'alive' && player.senses.includes(sense));
}

function spend(player: Player, amount: number, now: number) {
  if (remaining(player, now) <= amount) return false;
  player.expiresAt -= amount;
  return true;
}

function reveal(game: Game, player: Player, sense: Sense) {
  const found = player.discovered[game.chapter] ?? [];
  if (!found.includes(sense)) {
    player.discovered[game.chapter] = [...found, sense];
    player.stats.clues++;
  }
}

export function act(game: Game, id: string, action: GameAction, now: number, expectedRound = game.round): ActionResult {
  advanceGame(game, now);
  const player = game.players.find((item) => item.id === id);
  if (!player || !player.connected) return fail('Reconnect to the room before taking an action.');
  if (expectedRound !== game.round) return fail('The round changed. Your room has been refreshed.');
  if (action.type === 'ready') {
    if (game.phase !== 'lobby') return fail('The escape has already started.');
    player.ready = action.ready;
    note(game, 'info', `${player.name} ${action.ready ? 'is ready' : 'is getting ready'}.`, now, id);
    return ok;
  }
  if (action.type === 'start') {
    if (game.phase !== 'lobby' || game.hostId !== id) return fail('Only the host can start from the lobby.');
    if (game.players.length < (game.practice ? 1 : 2)) return fail('Invite at least one other explorer, or try solo practice.');
    if (game.players.some((item) => !item.ready || !item.connected)) return fail('Every explorer must be connected and ready.');
    game.phase = 'playing';
    game.round++;
    game.startedAt = now;
    game.endedAt = null;
    game.chapter = 0;
    game.rescueUsed = false;
    game.nextHauntAt = now + RULES.hauntInterval;
    game.lastHauntAt = null;
    game.events = [];
    for (const item of game.players) {
      item.status = 'alive';
      item.capturedAt = null;
      item.expiresAt = now + (game.difficulty === 'relaxed' ? RULES.relaxedFlame : RULES.initialFlame);
      item.spot = 'entrance';
      item.motion = still('entrance', now);
      item.discovered = {};
      item.echoes = {};
      item.stats = stats();
      item.lastAttemptAt = -Infinity;
    }
    note(game, 'info', 'The front door has closed. Keep the light. Find the way.', now);
    return ok;
  }
  if (action.type === 'restart') {
    if (game.hostId !== id || !['won', 'lost'].includes(game.phase)) return fail('Only the host can gather the team after a round.');
    game.players = game.players.filter((item) => item.connected);
    game.phase = 'lobby';
    game.seed = (Math.imul(game.seed, 1664525) + 1013904223) >>> 0;
    game.puzzles = makePuzzles(game.seed);
    game.chapter = 0;
    game.startedAt = null;
    game.endedAt = null;
    game.rescueUsed = false;
    game.players.forEach((item) => { item.ready = false; item.status = 'alive'; item.expiresAt = 0; item.discovered = {}; item.echoes = {}; });
    distributeSenses(game);
    note(game, 'info', 'A fresh set of secrets awaits. Ready when you are.', now);
    return ok;
  }
  if (game.phase !== 'playing') return fail('There is no active escape right now.');
  if ('chapter' in action && action.chapter !== game.chapter) return fail('That door has already opened. Look around the new room.');
  if (action.type === 'signal') {
    if (now - player.lastSignalAt < RULES.signalCooldown) return fail('Give your signal a moment to reach the team.');
    player.lastSignalAt = now;
    note(game, 'info', `${player.name}: ${SIGNALS[action.signal]}`, now, id);
    return ok;
  }
  if (action.type === 'share-clue') {
    if (!(player.discovered[game.chapter] ?? []).includes(action.sense)) return fail('Discover this clue before sharing it.');
    if (now - player.lastSignalAt < RULES.signalCooldown) return fail('Give your signal a moment to reach the team.');
    player.lastSignalAt = now;
    note(game, 'clue', `${player.name}: ${clueFor(game.chapter, game.puzzles[game.chapter], action.sense).text}`, now, id);
    return ok;
  }
  if (player.status !== 'alive') return fail('You are in the mist. Share what you remember while your team carries on.');
  if (action.type === 'move') {
    if (player.motion.endsAt > now) return fail('Finish this step before moving again.');
    const from = { ...SPOTS[player.spot] };
    const to = { ...SPOTS[action.spot] };
    const duration = Math.max(300, Math.round(Math.hypot(to.x - from.x, to.y - from.y) * 1700));
    player.spot = action.spot;
    player.motion = { from, to, startedAt: now, endsAt: now + duration };
    game.revision++;
    game.updatedAt = now;
    return ok;
  }
  if (action.type === 'inspect') {
    if (!hasSense(game, player, action.sense)) return fail('A different sense is needed. Ask its owner, or borrow an unavailable sense.');
    if (player.spot !== action.sense || player.motion.endsAt > now) return fail('Walk to this object before examining it.');
    reveal(game, player, action.sense);
    game.revision++;
    game.updatedAt = now;
    return ok;
  }
  if (action.type === 'echo') {
    if (hasSense(game, player, action.sense)) return fail('You already have access to this sense.');
    if (!canBorrow(game, action.sense)) return fail('This sense still has an active owner. Ask them to share their clue.');
    if (!spend(player, RULES.echoCost, now)) return fail('You need more than 20 seconds of flame to reach an echo.');
    player.echoes[game.chapter] = [...(player.echoes[game.chapter] ?? []), action.sense];
    reveal(game, player, action.sense);
    player.stats.echoes++;
    note(game, 'info', `${player.name} reached into the mist and borrowed a sense.`, now, id);
    return ok;
  }
  if (action.type === 'share' || action.type === 'rescue') {
    const target = game.players.find((item) => item.id === action.targetId);
    if (!target || target.id === id) return fail('Choose another explorer.');
    if (!target.connected) return fail('Wait for this explorer to reconnect first.');
    if (action.type === 'share') {
      if (target.status !== 'alive') return fail('This explorer needs a rescue, not a flame transfer.');
      if (remaining(target, now) + RULES.shareAmount > RULES.maxFlame) return fail('Their candle already holds enough light.');
      if (!spend(player, RULES.shareAmount, now)) return fail('Keep a little light for yourself. You need more than 20 seconds.');
      target.expiresAt += RULES.shareAmount;
      player.stats.shared += 20;
      note(game, 'success', `${player.name} shared 20 seconds of light with ${target.name}.`, now, id);
      return ok;
    }
    if (game.rescueUsed) return fail('The team has already used its one rescue.');
    if (target.status !== 'captured') return fail('This explorer is still with you.');
    if (!spend(player, RULES.rescueCost, now)) return fail('A rescue requires more than 40 seconds of your flame.');
    game.rescueUsed = true;
    target.status = 'alive';
    target.capturedAt = null;
    target.expiresAt = now + RULES.rescueFlame;
    target.spot = 'entrance';
    target.motion = still('entrance', now);
    player.stats.rescued++;
    note(game, 'success', `${player.name} brought ${target.name} back with 60 seconds of light. The team's rescue is spent.`, now, id);
    return ok;
  }
  if (action.type === 'solve') {
    if (!/^\d{3}$/.test(action.code)) return fail('The lock needs exactly three digits.');
    if (player.spot !== 'door' || player.motion.endsAt > now) return fail('Walk to the door before trying its lock.');
    if (now - player.lastAttemptAt < RULES.codeCooldown) return fail('The lock is resetting. Try again in a moment.');
    player.lastAttemptAt = now;
    if (action.code !== game.puzzles[game.chapter].solution) {
      game.players.filter((item) => item.status === 'alive').forEach((item) => { item.expiresAt -= RULES.wrongCodeCost; });
      note(game, 'danger', 'The lock refused the code. Every living flame lost 15 seconds.', now, id);
      settleCaptures(game, now);
      return ok;
    }
    player.stats.doors++;
    if (game.chapter === CHAPTERS.length - 1) {
      game.phase = 'won';
      game.endedAt = now;
      note(game, 'success', `${player.name} opened the last door. Everyone escapes, including those in the mist.`, now, id);
      return ok;
    }
    game.chapter++;
    game.players.forEach((item) => {
      if (item.status === 'alive') item.expiresAt = Math.min(item.expiresAt + RULES.doorReward, now + RULES.maxFlame);
      item.spot = 'entrance';
      item.motion = still('entrance', now);
    });
    note(game, 'success', `The door opens to ${CHAPTERS[game.chapter].name}. Every living flame gains 30 seconds.`, now, id);
    return ok;
  }
  return fail('That action is not available.');
}

export function viewFor(game: Game, id: string, now: number): GameView {
  const player = game.players.find((item) => item.id === id);
  const found = player?.discovered[game.chapter] ?? [];
  return {
    code: game.code, hostId: game.hostId, phase: game.phase, difficulty: game.difficulty, practice: game.practice,
    round: game.round, revision: game.revision, chapter: game.chapter, youId: id,
    players: game.players.map(({ id: playerId, name, seat, connected, ready, status, expiresAt, senses, spot, motion, stats: playerStats }) => ({ id: playerId, name, seat, connected, ready, status, expiresAt, senses: [...senses], spot, motion: { ...motion, from: { ...motion.from }, to: { ...motion.to } }, stats: { ...playerStats } })),
    clues: found.map((sense) => clueFor(game.chapter, game.puzzles[game.chapter], sense)),
    availableEchoes: player?.status === 'alive' ? SENSES.filter((sense) => !hasSense(game, player, sense) && canBorrow(game, sense)) : [],
    rescueUsed: game.rescueUsed, startedAt: game.startedAt, endedAt: game.endedAt, nextHauntAt: game.nextHauntAt,
    lastHauntAt: game.lastHauntAt, serverNow: now, events: game.events.map((event) => ({ ...event })),
  };
}

export function createPractice(name: string, seed: number, now: number, difficulty: Difficulty = 'relaxed') {
  const game = createGame('SOLO', seed, now, difficulty, true);
  if (!addPlayer(game, 'you', name || 'Explorer', now).ok) addPlayer(game, 'you', 'Explorer', now);
  act(game, 'you', { type: 'ready', ready: true }, now);
  act(game, 'you', { type: 'start' }, now);
  return game;
}
