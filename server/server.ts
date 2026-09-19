import { createServer } from 'node:http';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, relative, isAbsolute } from 'node:path';
import { clearInterval, setInterval } from 'node:timers';
import { WebSocket, WebSocketServer } from 'ws';
import { act, addPlayer, advanceGame, createGame, removePlayer, setConnected, viewFor } from '../shared/game';
import { SENSES } from '../shared/types';
import type { Game, GameAction, ServerMessage } from '../shared/types';

export type ServerOptions = { host?: string; port?: number; now?: () => number; tickMs?: number; allowedOrigins?: string[]; maxRooms?: number };
type Seat = { token: string; socket: WebSocket | null; disconnectedAt: number | null; replies: Map<string, ServerMessage> };
type Room = { game: Game; seats: Map<string, Seat> };
type Link = { code: string; playerId: string };
const numberSenses = new Set<string>(SENSES);
const spots = new Set<string>([...SENSES, 'entrance', 'door']);
const requestPattern = /^[a-zA-Z0-9_-]{1,64}$/;
const roomPattern = /^[A-HJ-NP-Z2-9]{6}$/;
const staticRoot = resolve(process.cwd(), 'dist');
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

function validAction(value: unknown): value is GameAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const a = value as Record<string, unknown>;
  const chapter = Number.isInteger(a.chapter) && Number(a.chapter) >= 0 && Number(a.chapter) < 3;
  const sense = typeof a.sense === 'string' && numberSenses.has(a.sense);
  switch (a.type) {
    case 'ready': return typeof a.ready === 'boolean';
    case 'start': case 'restart': return true;
    case 'move': return chapter && typeof a.spot === 'string' && spots.has(a.spot);
    case 'inspect': case 'echo': case 'share-clue': return chapter && sense;
    case 'solve': return chapter && typeof a.code === 'string' && /^\d{3}$/.test(a.code);
    case 'share': case 'rescue': return typeof a.targetId === 'string' && /^[a-f0-9]{16}$/.test(a.targetId);
    case 'signal': return ['help', 'door', 'wait', 'ready'].includes(String(a.signal));
    default: return false;
  }
}

export function createGameServer(options: ServerOptions = {}) {
  const baseTime = Date.now();
  const baseMonotonic = performance.now();
  const now = options.now ?? (() => Math.floor(baseTime + performance.now() - baseMonotonic));
  const rooms = new Map<string, Room>();
  const links = new Map<WebSocket, Link>();
  const budgets = new Map<string, { at: number; count: number }>();
  const origins = new Set(options.allowedOrigins ?? []);
  const allowed = (origin: string | undefined) => !origin || !origins.size || origins.has(origin);
  const limited = (key: string, limit: number, window = 60_000) => {
    const at = now();
    let budget = budgets.get(key);
    if (!budget || at - budget.at >= window) { budget = { at, count: 0 }; budgets.set(key, budget); }
    budget.count++;
    return budget.count > limit;
  };
  const send = (socket: WebSocket, message: ServerMessage) => {
    if (socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 256_000) socket.send(JSON.stringify(message));
  };
  const broadcast = (room: Room) => {
    for (const [id, seat] of room.seats) if (seat.socket) send(seat.socket, { type: 'state', view: viewFor(room.game, id, now()) });
  };
  const httpServer = createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('X-Frame-Options', 'DENY');
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.writeHead(405).end(); return; }
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    if (pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok', game: 'Last Flame', version: '1.0.0' }));
      return;
    }
    const candidate = resolve(staticRoot, `.${pathname}`);
    const traversal = relative(staticRoot, candidate);
    if (traversal.startsWith('..') || isAbsolute(traversal) || pathname.includes('\0')) { response.writeHead(403).end(); return; }
    let file = candidate;
    if (!existsSync(file) || !statSync(file).isFile()) {
      if (extname(pathname)) { response.writeHead(404).end(); return; }
      file = resolve(staticRoot, 'index.html');
    }
    if (!existsSync(file)) { response.writeHead(503, { 'Content-Type': 'text/plain' }).end('The client is not built yet. Run npm run build:web.'); return; }
    const type = mime[extname(file)] ?? 'application/octet-stream';
    response.setHeader('Content-Type', type);
    response.setHeader('Cache-Control', extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600');
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = createReadStream(file);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws' || !allowed(request.headers.origin) || wss.clients.size >= 1000) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => wss.emit('connection', client, request));
  });
  wss.on('connection', (socket, request) => {
    const ip = request.socket.remoteAddress ?? 'unknown';
    const connectionId = randomBytes(8).toString('hex');
    let alive = true;
    socket.on('pong', () => { alive = true; });
    const heartbeat = setInterval(() => {
      if (!alive) { socket.terminate(); return; }
      alive = false;
      socket.ping();
    }, 20_000);
    socket.on('error', () => { socket.terminate(); });
    socket.on('message', (data, binary) => {
      if (binary || limited(`frames:${connectionId}`, 24, 1000)) {
        socket.close(1008, 'Too many requests.');
        return;
      }
      let message: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(data.toString());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid message');
        message = parsed as Record<string, unknown>;
      } catch { send(socket, { type: 'error', error: 'Send a valid game message.' }); return; }
      const requestId = typeof message.requestId === 'string' ? message.requestId : '';
      if (!requestPattern.test(requestId)) { send(socket, { type: 'error', error: 'This request is missing a valid identifier.' }); return; }
      const error = (text: string) => send(socket, { type: 'error', requestId, error: text });
      const current = links.get(socket);
      if (['create', 'join', 'resume'].includes(String(message.type))) {
        if (current) { error('Leave your current room before joining another.'); return; }
        if (limited(`auth:${ip}`, 40)) { error('Too many connection attempts. Please wait a minute.'); return; }
        let room: Room | undefined;
        let playerId = '';
        let token = '';
        if (message.type === 'resume') {
          if (typeof message.code !== 'string' || typeof message.playerId !== 'string' || typeof message.token !== 'string' || !/^[a-f0-9]{48}$/.test(message.token)) { error('Your reconnect session is invalid. Join the room again.'); return; }
          room = rooms.get(message.code);
          const seat = room?.seats.get(message.playerId);
          if (!room || !seat || !timingSafeEqual(Buffer.from(seat.token), Buffer.from(message.token))) { error('This room or reconnect session has expired.'); return; }
          playerId = message.playerId;
          token = seat.token;
          if (seat.socket && seat.socket !== socket) { links.delete(seat.socket); seat.socket.close(4001, 'Reconnected on another connection.'); }
          seat.socket = socket;
          seat.disconnectedAt = null;
          setConnected(room.game, playerId, true, now());
        } else {
          if (typeof message.name !== 'string') { error('Enter your explorer name.'); return; }
          if (message.type === 'create') {
            if (rooms.size >= (options.maxRooms ?? 200) || limited(`create:${ip}`, 8)) { error('New rooms are temporarily limited. Try again shortly.'); return; }
            const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code: string;
            do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
            room = { game: createGame(code, randomInt(0xFFFFFFFF), now(), message.difficulty === 'relaxed' ? 'relaxed' : 'standard'), seats: new Map() };
          } else {
            if (typeof message.code !== 'string' || !roomPattern.test(message.code)) { error('Enter the six-character room code.'); return; }
            room = rooms.get(message.code);
            if (!room) { error('We could not find that room. Check the code with your host.'); return; }
          }
          playerId = randomBytes(8).toString('hex');
          token = randomBytes(24).toString('hex');
          const result = addPlayer(room.game, playerId, message.name, now());
          if (!result.ok) { error(result.error); return; }
          room.seats.set(playerId, { token, socket, disconnectedAt: null, replies: new Map() });
          rooms.set(room.game.code, room);
        }
        links.set(socket, { code: room.game.code, playerId });
        send(socket, { type: 'welcome', requestId, session: { code: room.game.code, playerId, token }, view: viewFor(room.game, playerId, now()) });
        broadcast(room);
        return;
      }
      if (!current) { error('Join a room before taking an action.'); return; }
      const room = rooms.get(current.code);
      const seat = room?.seats.get(current.playerId);
      if (!room || !seat || seat.socket !== socket) { error('Your room session has expired.'); return; }
      if (message.type === 'leave') {
        removePlayer(room.game, current.playerId, now());
        room.seats.delete(current.playerId);
        links.delete(socket);
        send(socket, { type: 'ack', requestId, ok: true });
        broadcast(room);
        return;
      }
      if (message.type !== 'action' || !Number.isInteger(message.round) || !validAction(message.action)) { error('This game action is not valid.'); return; }
      const prior = seat.replies.get(requestId);
      if (prior) { send(socket, prior); send(socket, { type: 'state', view: viewFor(room.game, current.playerId, now()) }); return; }
      const result = act(room.game, current.playerId, message.action, now(), Number(message.round));
      const reply: ServerMessage = { type: 'ack', requestId, ok: result.ok, ...(!result.ok ? { error: result.error } : {}) };
      seat.replies.set(requestId, reply);
      if (seat.replies.size > 64) seat.replies.delete(seat.replies.keys().next().value!);
      send(socket, reply);
      broadcast(room);
    });
    socket.on('close', () => {
      clearInterval(heartbeat);
      const link = links.get(socket);
      links.delete(socket);
      if (!link) return;
      const room = rooms.get(link.code);
      const seat = room?.seats.get(link.playerId);
      if (!room || !seat || seat.socket !== socket) return;
      seat.socket = null;
      seat.disconnectedAt = now();
      setConnected(room.game, link.playerId, false, now());
      broadcast(room);
    });
  });
  const tick = () => {
    const at = now();
    for (const [code, room] of rooms) {
      const revision = room.game.revision;
      advanceGame(room.game, at);
      for (const [id, seat] of room.seats) {
        if (room.game.phase === 'lobby' && seat.disconnectedAt !== null && at - seat.disconnectedAt > 60_000) {
          removePlayer(room.game, id, at);
          room.seats.delete(id);
        }
      }
      if (!room.seats.size || at - room.game.updatedAt > 30 * 60_000) {
        for (const seat of room.seats.values()) seat.socket?.close(4000, 'Room expired.');
        rooms.delete(code);
      } else if (room.game.phase === 'playing' || room.game.revision !== revision) broadcast(room);
    }
    for (const [key, value] of budgets) if (at - value.at > 120_000) budgets.delete(key);
  };
  const interval = setInterval(tick, options.tickMs ?? 1000);
  interval.unref();
  return {
    httpServer, rooms, tick,
    listen: () => new Promise<number>((resolvePort, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(options.port ?? 8787, options.host ?? '0.0.0.0', () => {
        httpServer.off('error', reject);
        const address = httpServer.address();
        resolvePort(address && typeof address === 'object' ? address.port : 8787);
      });
    }),
    close: () => new Promise<void>((done) => {
      clearInterval(interval);
      for (const socket of wss.clients) socket.terminate();
      wss.close(() => {
        httpServer.close(() => done());
        httpServer.closeAllConnections();
      });
    }),
  };
}
