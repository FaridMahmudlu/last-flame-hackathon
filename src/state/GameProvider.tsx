import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { act, advanceGame, createPractice, viewFor } from '../../shared/game';
import type { Difficulty, Game, GameAction, GameView, Session } from '../../shared/types';
import { GameClient, defaultServer } from '../lib/client';
import type { Connection } from '../lib/client';
import { readStored, saveStored } from '../lib/storage';
import { usePreferences } from './Preferences';

type ContextValue = {
  view: GameView | null; connection: Connection; error: string | null; pending: boolean; offset: number;
  server: string; resumeSession: Session | null;
  create: (name: string, difficulty: Difficulty) => Promise<boolean>;
  join: (name: string, code: string) => Promise<boolean>;
  resume: () => Promise<boolean>;
  practice: (name?: string) => void;
  send: (action: GameAction) => Promise<boolean>;
  leave: () => Promise<void>;
  clearError: () => void;
};
const Context = createContext<ContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { preferences, update } = usePreferences();
  const server = preferences.server || defaultServer();
  const client = useMemo(() => new GameClient(server), [server]);
  const network = useSyncExternalStore(client.subscribe, client.snapshot, client.snapshot);
  const localGame = useRef<Game | null>(null);
  const [localView, setLocalView] = useState<GameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resumeSession, setResumeSession] = useState<Session | null>(null);
  const practiceActive = localView !== null;
  const refreshLocal = useCallback(() => {
    if (!localGame.current) return;
    advanceGame(localGame.current, Date.now());
    setLocalView(viewFor(localGame.current, 'you', Date.now()));
  }, []);
  useEffect(() => () => client.destroy(), [client]);
  useEffect(() => {
    let current = true;
    void readStored<Session | null>('lastflame.session', null, true).then((saved) => {
      if (current && saved?.server === server && typeof saved.token === 'string' && typeof saved.code === 'string' && typeof saved.playerId === 'string') setResumeSession(saved);
    });
    return () => { current = false; };
  }, [server]);
  useEffect(() => {
    if (network.session) {
      void saveStored('lastflame.session', network.session, true);
    }
  }, [network.session]);
  useEffect(() => {
    if (localView?.phase !== 'playing') return;
    const timer = setInterval(refreshLocal, 500);
    return () => clearInterval(timer);
  }, [localView?.phase, refreshLocal]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (localGame.current) refreshLocal();
      else if (network.session && network.connection === 'offline') void client.reconnect(network.session).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not reconnect.'));
    });
    return () => subscription.remove();
  }, [client, network.session, network.connection, refreshLocal]);
  const run = async (operation: () => Promise<void>) => {
    setError(null);
    client.clearError();
    setBusy(true);
    try { await operation(); return true; }
    catch (cause) { if (!localGame.current) setError(cause instanceof Error ? cause.message : 'Something interrupted the connection. Please try again.'); return false; }
    finally { setBusy(false); }
  };
  const practice = (name?: string) => {
    client.destroy();
    client.clearError();
    setError(null);
    localGame.current = createPractice(name?.trim() || preferences.name || 'Explorer', Math.floor(Math.random() * 0xFFFFFFFF), Date.now());
    refreshLocal();
  };
  const send = async (action: GameAction) => {
    setError(null);
    if (localGame.current) {
      if (action.type === 'restart') { practice(); return true; }
      const result = act(localGame.current, 'you', action, Date.now());
      refreshLocal();
      if (!result.ok) setError(result.error);
      return result.ok;
    }
    return run(() => client.action(action));
  };
  const leave = async () => {
    localGame.current = null;
    setLocalView(null);
    setResumeSession(null);
    setError(null);
    await saveStored('lastflame.session', null, true);
    try { await client.leave(); } catch { client.destroy(); }
  };
  return <Context.Provider value={{
    view: localView ?? network.view, connection: practiceActive ? 'idle' : network.connection,
    error: error ?? network.error, pending: busy || network.pending, offset: practiceActive ? 0 : network.offset,
    server, resumeSession: network.session ?? resumeSession,
    create: (name, difficulty) => run(async () => { await client.create(name, difficulty); update({ name: name.trim() }); }),
    join: (name, code) => run(async () => { await client.join(name, code); update({ name: name.trim() }); }),
    resume: () => run(async () => { const session = network.session ?? resumeSession; if (!session) throw new Error('There is no saved room to rejoin.'); await client.reconnect(session); }),
    practice, send, leave, clearError: () => { setError(null); client.clearError(); },
  }}>{children}</Context.Provider>;
}

export function useGame() {
  const context = useContext(Context);
  if (!context) throw new Error('GameProvider is required.');
  return context;
}

export function useNow(offset = 0) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  return now + offset;
}
