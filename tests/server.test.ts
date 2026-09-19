import { it } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../server/server';
import type { ServerMessage } from '../shared/types';

let sequence = 0;
async function peer(port: number) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const messages: ServerMessage[] = [];
  socket.on('message', (data) => messages.push(JSON.parse(data.toString()) as ServerMessage));
  await once(socket, 'open');
  const request = async (body: Record<string, unknown>, fixedId?: string): Promise<ServerMessage> => {
    const requestId = fixedId ?? `req-${++sequence}`;
    const pending = new Promise<ServerMessage>((resolve, reject) => {
      const timeout = setTimeout(() => { socket.off('message', listener); reject(new Error('Response timed out')); }, 4000);
      const listener = (data: Buffer) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        if ('requestId' in message && message.requestId === requestId) {
          clearTimeout(timeout);
          socket.off('message', listener);
          resolve(message);
        }
      };
      socket.on('message', listener);
    });
    socket.send(JSON.stringify({ ...body, requestId }));
    return pending;
  };
  return { socket, request, messages };
}

it('four real WebSocket clients synchronize, protect clues, deduplicate actions, and reconnect', async (t) => {
  let now = 2_000_000;
  const server = createGameServer({ port: 0, host: '127.0.0.1', now: () => now, tickMs: 10_000 });
  const port = await server.listen();
  t.after(() => server.close());
  const clients = await Promise.all([peer(port), peer(port), peer(port), peer(port)]);
  const welcome = await clients[0].request({ type: 'create', name: 'Alex', difficulty: 'standard' });
  assert.equal(welcome.type, 'welcome');
  if (welcome.type !== 'welcome') throw new Error('Missing welcome');
  const code = welcome.session.code;
  const sessions = [welcome.session];
  for (let i = 1; i < clients.length; i++) {
    const joined = await clients[i].request({ type: 'join', name: `Explorer ${i}`, code });
    assert.equal(joined.type, 'welcome');
    if (joined.type === 'welcome') sessions.push(joined.session);
  }
  const room = server.rooms.get(code)!;
  assert.equal(room.game.players.length, 4);
  for (const client of clients) {
    const reply = await client.request({ type: 'action', round: 0, action: { type: 'ready', ready: true } });
    assert.equal(reply.type === 'ack' && reply.ok, true);
  }
  const started = await clients[0].request({ type: 'action', round: 0, action: { type: 'start' } });
  assert.equal(started.type === 'ack' && started.ok, true);
  assert.equal(room.game.phase, 'playing');
  const before = room.game.players[0].expiresAt;
  const transfer = { type: 'action', round: 1, action: { type: 'share', targetId: sessions[1].playerId } };
  await clients[0].request(transfer, 'same-action');
  await clients[0].request(transfer, 'same-action');
  assert.equal(room.game.players[0].expiresAt, before - 20_000);
  assert.equal(room.game.players[1].expiresAt, before + 20_000);
  const forged = await clients[0].request({ type: 'action', round: 1, action: { type: 'inspect', sense: '__proto__', chapter: 0 } });
  assert.equal(forged.type, 'error');
  for (const client of clients) {
    assert.equal(JSON.stringify(client.messages).includes('"solution"'), false);
    assert.equal(JSON.stringify(client.messages).includes('"puzzles"'), false);
  }
  room.game.players[2].expiresAt = now;
  room.game.players[3].expiresAt = now;
  server.tick();
  const rescues = await Promise.all([
    clients[0].request({ type: 'action', round: 1, action: { type: 'rescue', targetId: sessions[2].playerId } }),
    clients[1].request({ type: 'action', round: 1, action: { type: 'rescue', targetId: sessions[3].playerId } }),
  ]);
  assert.equal(rescues.filter((reply) => reply.type === 'ack' && reply.ok).length, 1);
  assert.equal(room.game.rescueUsed, true);
  const closed = once(clients[0].socket, 'close');
  clients[0].socket.close();
  await closed;
  now += 1000;
  const reconnected = await peer(port);
  const resumed = await reconnected.request({ type: 'resume', ...sessions[0] });
  assert.equal(resumed.type, 'welcome');
  if (resumed.type === 'welcome') {
    assert.equal(resumed.view.youId, sessions[0].playerId);
    assert.equal(resumed.view.rescueUsed, true);
    assert.equal(resumed.view.phase, 'playing');
  }
  const intruder = await peer(port);
  const rejected = await intruder.request({ type: 'resume', ...sessions[0], token: '0'.repeat(48) });
  assert.equal(rejected.type, 'error');
  const newcomer = await peer(port);
  const lateJoin = await newcomer.request({ type: 'join', code, name: 'Late explorer' });
  assert.equal(lateJoin.type, 'error');
});

it('broadcasts a timer-driven loss without needing another client action', async (t) => {
  let now = 3_000_000;
  const server = createGameServer({ port: 0, host: '127.0.0.1', now: () => now, tickMs: 10_000 });
  const port = await server.listen();
  t.after(() => server.close());
  const a = await peer(port);
  const b = await peer(port);
  const welcome = await a.request({ type: 'create', name: 'Alice' });
  if (welcome.type !== 'welcome') throw new Error('Missing welcome');
  await b.request({ type: 'join', code: welcome.session.code, name: 'Blair' });
  for (const client of [a, b]) await client.request({ type: 'action', round: 0, action: { type: 'ready', ready: true } });
  await a.request({ type: 'action', round: 0, action: { type: 'start' } });
  const ended = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timer loss was never broadcast')), 1000);
    a.socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      if (message.type === 'state' && message.view.phase === 'lost') { clearTimeout(timeout); resolve(); }
    });
  });
  now += 400_000;
  server.tick();
  await ended;
});

it('enforces origin restrictions when configured while allowing native clients', async (t) => {
  const server = createGameServer({ port: 0, host: '127.0.0.1', allowedOrigins: ['https://lastflame.example'] });
  const port = await server.listen();
  t.after(() => server.close());
  const native = await peer(port);
  assert.equal(native.socket.readyState, WebSocket.OPEN);
  const blocked = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: 'https://untrusted.example' });
  const [error] = await once(blocked, 'error');
  assert.match(String(error), /403/);
});

it('serves a health check but never exposes source files through traversal', async (t) => {
  const server = createGameServer({ port: 0, host: '127.0.0.1' });
  const port = await server.listen();
  t.after(() => server.close());
  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).game, 'Last Flame');
  const traversal = await fetch(`http://127.0.0.1:${port}/..%2fpackage.json`);
  assert.equal(traversal.status, 403);
});
