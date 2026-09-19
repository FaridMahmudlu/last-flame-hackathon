import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { act, addPlayer, advanceGame, createGame, createPractice, remaining, removePlayer, setConnected, viewFor } from '../shared/game';
import { makePuzzles, RULES } from '../shared/content';
import { SENSES } from '../shared/types';
import type { Game, Sense, Spot } from '../shared/types';

const T = 1_000_000;
function fixture(count = 4) {
  const game = createGame('ABCDEF', 4237, T, 'standard');
  for (let i = 0; i < count; i++) {
    assert.equal(addPlayer(game, `p${i}`, `Explorer ${i}`, T).ok, true);
    act(game, `p${i}`, { type: 'ready', ready: true }, T);
  }
  assert.equal(act(game, 'p0', { type: 'start' }, T).ok, true);
  return game;
}
function go(game: Game, id: string, spot: Spot, now: number) {
  assert.equal(act(game, id, { type: 'move', spot, chapter: game.chapter }, now).ok, true);
  return game.players.find((player) => player.id === id)!.motion.endsAt + 1;
}

describe('Last Flame rules', () => {
  it('assigns every sense exactly once for two, three, and four players', () => {
    for (const count of [2, 3, 4]) {
      const game = fixture(count);
      assert.deepEqual(game.players.flatMap((player) => player.senses).sort(), [...SENSES].sort());
      assert.ok(game.players.every((player) => player.senses.length));
    }
  });
  it('requires all explorers to be ready and only lets the host start', () => {
    const game = createGame('ABCDEF', 1, T);
    addPlayer(game, 'a', 'Alice', T);
    addPlayer(game, 'b', 'Blair', T);
    act(game, 'a', { type: 'ready', ready: true }, T);
    assert.equal(act(game, 'a', { type: 'start' }, T).ok, false);
    act(game, 'b', { type: 'ready', ready: true }, T);
    assert.equal(act(game, 'b', { type: 'start' }, T).ok, false);
    assert.equal(act(game, 'a', { type: 'start' }, T).ok, true);
  });
  it('runs solo practice with all senses and no server', () => {
    const game = createPractice('Alex', 5, T);
    assert.equal(game.phase, 'playing');
    assert.deepEqual(game.players[0].senses, [...SENSES]);
    assert.equal(remaining(game.players[0], T), 300_000);
  });
  it('falls back to a valid name when practice is given an invalid name', () => {
    for (const name of ['A', '<invalid>']) {
      const game = createPractice(name, 5, T);
      assert.equal(game.phase, 'playing');
      assert.equal(game.players[0].name, 'Explorer');
    }
  });
  it('does not disclose puzzle solutions, seeds, or other private senses', () => {
    const game = fixture();
    const view = viewFor(game, 'p0', T);
    assert.deepEqual(view.clues, []);
    assert.equal('seed' in view, false);
    assert.equal('puzzles' in view, false);
    assert.equal('solution' in view, false);
    assert.equal(act(game, 'p0', { type: 'inspect', sense: 'hearing', chapter: 0 }, T).ok, false);
  });
  it('requires arrival at an object before revealing a clue', () => {
    const game = fixture();
    const arrived = go(game, 'p0', 'sight', T);
    assert.equal(act(game, 'p0', { type: 'inspect', sense: 'sight', chapter: 0 }, T).ok, false);
    assert.equal(act(game, 'p0', { type: 'inspect', sense: 'sight', chapter: 0 }, arrived).ok, true);
    assert.equal(viewFor(game, 'p0', arrived).clues.length, 1);
    assert.equal(viewFor(game, 'p1', arrived).clues.length, 0);
  });
  it('transfers exactly 20 seconds without creating light', () => {
    const game = fixture();
    const before = game.players.reduce((sum, player) => sum + player.expiresAt, 0);
    assert.equal(act(game, 'p0', { type: 'share', targetId: 'p1' }, T).ok, true);
    assert.equal(game.players[0].expiresAt, T + RULES.initialFlame - RULES.shareAmount);
    assert.equal(game.players[1].expiresAt, T + RULES.initialFlame + RULES.shareAmount);
    assert.equal(game.players.reduce((sum, player) => sum + player.expiresAt, 0), before);
  });
  it('does not allow a transfer or rescue that would extinguish the donor', () => {
    const game = fixture();
    game.players[0].expiresAt = T + RULES.shareAmount;
    assert.equal(act(game, 'p0', { type: 'share', targetId: 'p1' }, T).ok, false);
    assert.equal(game.players[0].status, 'alive');
  });
  it('allows exactly one rescue for the entire team, even for different targets', () => {
    const game = fixture();
    game.players[1].expiresAt = T;
    game.players[2].expiresAt = T;
    advanceGame(game, T);
    assert.equal(act(game, 'p0', { type: 'rescue', targetId: 'p1' }, T).ok, true);
    assert.equal(game.players[1].expiresAt, T + 60_000);
    assert.equal(game.players[0].expiresAt, T + 140_000);
    assert.equal(act(game, 'p3', { type: 'rescue', targetId: 'p2' }, T).ok, false);
    assert.equal(game.players[3].expiresAt, T + 180_000);
  });
  it('lets the last survivor borrow lost senses and win for all four players', () => {
    const game = fixture();
    game.players.slice(1).forEach((player) => { player.expiresAt = T; });
    advanceGame(game, T);
    assert.equal(game.phase, 'playing');
    let now = T;
    for (let chapter = 0; chapter < 3; chapter++) {
      for (const sense of ['hearing', 'reading', 'instinct'] as Sense[]) {
        assert.equal(act(game, 'p0', { type: 'echo', sense, chapter }, now).ok, true);
        assert.ok(viewFor(game, 'p0', now).clues.some((clue) => clue.sense === sense));
      }
      now = go(game, 'p0', 'door', now);
      assert.equal(act(game, 'p0', { type: 'solve', code: game.puzzles[chapter].solution, chapter }, now).ok, true);
      now += 1600;
    }
    assert.equal(game.phase, 'won');
    assert.equal(game.players.filter((player) => player.status === 'captured').length, 3);
    assert.ok(game.players.every((player) => viewFor(game, player.id, now).phase === 'won'));
  });
  it('keeps echoes available if a sense owner disconnects', () => {
    const game = fixture();
    setConnected(game, 'p1', false, T);
    assert.ok(viewFor(game, 'p0', T).availableEchoes.includes('hearing'));
    assert.equal(act(game, 'p0', { type: 'echo', sense: 'hearing', chapter: 0 }, T).ok, true);
    const expires = game.players[0].expiresAt;
    assert.equal(act(game, 'p0', { type: 'echo', sense: 'hearing', chapter: 0 }, T).ok, false);
    assert.equal(game.players[0].expiresAt, expires);
  });
  it('ends the round immediately when every flame goes out', () => {
    const game = fixture();
    game.players.forEach((player) => { player.expiresAt = T + 100; });
    advanceGame(game, T + 100);
    assert.equal(game.phase, 'lost');
    assert.equal(act(game, 'p0', { type: 'rescue', targetId: 'p1' }, T + 100).ok, false);
  });
  it('catches up timer events consistently after a suspended client', () => {
    const one = fixture();
    const stepped = fixture();
    advanceGame(one, T + 170_000);
    for (let offset = 1000; offset <= 170_000; offset += 1000) advanceGame(stepped, T + offset);
    assert.deepEqual(one.players.map((player) => [player.status, player.expiresAt]), stepped.players.map((player) => [player.status, player.expiresAt]));
    assert.equal(one.phase, stepped.phase);
    assert.equal(one.nextHauntAt, stepped.nextHauntAt);
  });
  it('penalizes wrong codes, not malformed input, and rejects immediate retries', () => {
    const game = fixture();
    const now = go(game, 'p0', 'door', T);
    const before = game.players[0].expiresAt;
    assert.equal(act(game, 'p0', { type: 'solve', code: 'xx', chapter: 0 }, now).ok, false);
    assert.equal(game.players[0].expiresAt, before);
    assert.equal(act(game, 'p0', { type: 'solve', code: '000', chapter: 0 }, now).ok, true);
    assert.ok(game.players.every((player) => player.expiresAt === T + 165_000));
    assert.equal(act(game, 'p0', { type: 'solve', code: '000', chapter: 0 }, now + 1).ok, false);
  });
  it('ignores a second solver using a stale chapter instead of charging the team', () => {
    const game = fixture();
    const now = go(game, 'p0', 'door', T);
    const code = game.puzzles[0].solution;
    act(game, 'p0', { type: 'solve', code, chapter: 0 }, now);
    const before = game.players.map((player) => player.expiresAt);
    assert.equal(act(game, 'p1', { type: 'solve', code, chapter: 0 }, now).ok, false);
    assert.deepEqual(game.players.map((player) => player.expiresAt), before);
  });
  it('migrates the host and makes a departing player’s senses available', () => {
    const game = fixture();
    removePlayer(game, 'p0', T);
    assert.equal(game.hostId, 'p1');
    assert.ok(viewFor(game, 'p1', T).availableEchoes.includes('sight'));
  });
  it('resets the rescue and private discoveries for a new round', () => {
    const game = fixture();
    game.rescueUsed = true;
    game.phase = 'won';
    assert.equal(act(game, 'p0', { type: 'restart' }, T).ok, true);
    assert.equal(game.rescueUsed, false);
    game.players.forEach((player) => act(game, player.id, { type: 'ready', ready: true }, T));
    act(game, 'p0', { type: 'start' }, T);
    assert.equal(game.round, 2);
    assert.equal(act(game, 'p0', { type: 'share', targetId: 'p1' }, T, 1).ok, false);
  });
  it('generates solvable, deterministic three-digit puzzles for many seeds', () => {
    for (let seed = 0; seed < 500; seed++) {
      const puzzles = makePuzzles(seed);
      assert.deepEqual(puzzles, makePuzzles(seed));
      for (const puzzle of puzzles) {
        assert.match(puzzle.solution, /^\d{3}$/);
        assert.equal(new Set(puzzle.order).size, 3);
        assert.equal(puzzle.solution, puzzle.order.map((sense) => puzzle.values[sense]).join(''));
      }
    }
  });
});
