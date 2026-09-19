import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Difficulty, GameAction, GameView, ServerMessage, Session } from '../../shared/types';

export type Connection = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
export type ClientState = { view: GameView | null; session: Session | null; connection: Connection; error: string | null; pending: boolean; offset: number };
type Pending = { resolve: (message: ServerMessage) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> };

export function defaultServer(): string {
  const configured = process.env.EXPO_PUBLIC_GAME_SERVER_URL || Constants.expoConfig?.extra?.gameServerUrl;
  if (typeof configured === 'string' && configured.trim()) return configured.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL(window.location.origin);
    if (['8081', '19006'].includes(url.port)) url.port = '8787';
    return url.origin;
  }
  const host = Constants.expoConfig?.hostUri;
  if (host) {
    const url = new URL(`http://${host}`);
    url.port = '8787';
    return url.origin;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787';
}

export class GameClient {
  private state: ClientState = { view: null, session: null, connection: 'idle', error: null, pending: false, offset: 0 };
  private listeners = new Set<() => void>();
  private socket: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectTask: Promise<void> | null = null;
  private authenticated = false;
  private sequence = 0;
  private retries = 0;
  private intentionalClose = false;
  readonly server: string;

  constructor(server: string) { this.server = server.replace(/\/$/, ''); }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.state;
  private update(change: Partial<ClientState>) { this.state = { ...this.state, ...change }; this.listeners.forEach((listener) => listener()); }
  clearError = () => this.update({ error: null });
  private id() { return `${Date.now().toString(36)}-${(++this.sequence).toString(36)}`; }

  private accept(message: ServerMessage) {
    if (message.type === 'state' || message.type === 'welcome') {
      const view = message.view;
      if (!this.state.view || view.code !== this.state.view.code || view.revision >= this.state.view.revision) {
        this.update({ view, offset: view.serverNow - Date.now(), connection: 'connected' });
      }
    }
    if (message.type === 'welcome') {
      this.authenticated = true;
      this.retries = 0;
      this.update({ session: { ...message.session, server: this.server }, error: null });
    }
    if ('requestId' in message && message.requestId) {
      const pending = this.pending.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(message.requestId);
        this.update({ pending: this.pending.size > 0 });
        if (message.type === 'error' || (message.type === 'ack' && !message.ok)) pending.reject(new Error(message.error ?? 'The action could not be completed.'));
        else pending.resolve(message);
      }
    }
    if (message.type === 'error') this.update({ error: message.error });
  }

  private connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;
    this.intentionalClose = false;
    this.update({ connection: this.state.session ? 'reconnecting' : 'connecting', error: null });
    this.connectPromise = new Promise<void>((resolve, reject) => {
      const url = new URL(this.server);
      if (!['http:', 'https:'].includes(url.protocol)) { reject(new Error('The game server must use HTTP or HTTPS.')); return; }
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/ws';
      url.search = '';
      const socket = new WebSocket(url.toString());
      this.authenticated = false;
      this.socket = socket;
      let opened = false;
      const timeout = setTimeout(() => { socket.close(); reject(new Error('Cannot reach the game server. Check your connection, or try solo practice.')); }, 7000);
      socket.onopen = () => { opened = true; clearTimeout(timeout); this.update({ connection: 'connected' }); resolve(); };
      socket.onmessage = (event) => {
        if (this.socket !== socket || typeof event.data !== 'string') return;
        try { this.accept(JSON.parse(event.data) as ServerMessage); }
        catch { this.update({ error: 'The connection returned an unreadable update. Please reconnect.' }); }
      };
      socket.onerror = () => {
        if (!opened) { clearTimeout(timeout); reject(new Error('Cannot reach the game server. Keep every device on the same server, or try solo practice.')); }
      };
      socket.onclose = (event) => {
        clearTimeout(timeout);
        if (!opened) reject(new Error('The game server is unavailable. Check the server address in Settings.'));
        if (this.socket !== socket) return;
        this.socket = null;
        this.authenticated = false;
        for (const pending of this.pending.values()) { clearTimeout(pending.timeout); pending.reject(new Error('Connection interrupted. Your game will resync when you reconnect.')); }
        this.pending.clear();
        this.update({ pending: false, connection: this.intentionalClose ? 'idle' : 'offline' });
        if (event.code === 4001 || event.code === 4000) {
          this.update({ session: null, error: event.code === 4001 ? 'This explorer rejoined on another connection.' : 'This room has expired. Start a new escape.' });
          return;
        }
        if (this.state.session && !this.intentionalClose) this.scheduleReconnect();
      };
    }).finally(() => { this.connectPromise = null; });
    return this.connectPromise;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.retries >= 6) return;
    this.update({ connection: 'reconnecting' });
    const delay = Math.min(750 * 2 ** this.retries++, 8000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      const session = this.state.session;
      if (session && !this.intentionalClose) void this.reconnect(session).catch(() => {
        if (this.socket?.readyState === WebSocket.OPEN) this.update({ session: null, connection: 'offline' });
        else this.scheduleReconnect();
      });
    }, delay);
  }

  private async request(message: Record<string, unknown>): Promise<ServerMessage> {
    await this.connect();
    const requestId = this.id();
    this.update({ pending: true });
    return new Promise<ServerMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        this.update({ pending: this.pending.size > 0 });
        reject(new Error('The server did not respond. Reconnect to check the latest game state.'));
      }, 8000);
      this.pending.set(requestId, { resolve, reject, timeout });
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        this.update({ pending: false });
        reject(new Error('The connection is not ready. Please try again.'));
        return;
      }
      this.socket.send(JSON.stringify({ ...message, requestId }));
    });
  }

  async create(name: string, difficulty: Difficulty) { await this.request({ type: 'create', name, difficulty }); }
  async join(name: string, code: string) { await this.request({ type: 'join', name, code: code.trim().toUpperCase() }); }
  async reconnect(session: Session) {
    if (this.authenticated && this.socket?.readyState === WebSocket.OPEN && this.state.session?.playerId === session.playerId && this.state.session.code === session.code) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.reconnectTask) return this.reconnectTask;
    this.update({ session });
    this.reconnectTask = (async () => {
      try {
        await this.request({ type: 'resume', code: session.code, playerId: session.playerId, token: session.token });
      } catch (error) {
        if (this.socket?.readyState === WebSocket.OPEN && !this.authenticated) this.update({ session: null, view: null, connection: 'offline' });
        throw error;
      }
    })().finally(() => { this.reconnectTask = null; });
    return this.reconnectTask;
  }
  async action(action: GameAction) {
    if (!this.state.view) throw new Error('Join a room before taking an action.');
    await this.request({ type: 'action', round: this.state.view.round, action });
  }
  async leave() {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    try { if (this.socket?.readyState === WebSocket.OPEN && this.state.session) await this.request({ type: 'leave' }); }
    finally { this.destroy(); this.update({ view: null, session: null, connection: 'idle', pending: false, error: null }); }
  }
  destroy() {
    this.intentionalClose = true;
    this.authenticated = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    for (const pending of this.pending.values()) { clearTimeout(pending.timeout); pending.reject(new Error('The room was closed.')); }
    this.pending.clear();
    const socket = this.socket;
    this.socket = null;
    this.update({ connection: 'idle', pending: false });
    socket?.close();
  }
}
