import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { readStored, saveStored } from '../lib/storage';

type Preferences = { name: string; sound: boolean; haptics: boolean; reducedMotion: boolean; server: string };
const defaults: Preferences = { name: '', sound: true, haptics: true, reducedMotion: false, server: '' };
const Context = createContext<{ preferences: Preferences; update: (value: Partial<Preferences>) => void; reducedMotion: boolean } | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  const [systemMotion, setSystemMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    void readStored<Partial<Preferences>>('lastflame.preferences', {}).then((saved) => {
      if (!alive || !saved || typeof saved !== 'object') return;
      setPreferences({ name: typeof saved.name === 'string' ? saved.name.slice(0, 18) : '', sound: typeof saved.sound === 'boolean' ? saved.sound : true, haptics: typeof saved.haptics === 'boolean' ? saved.haptics : true, reducedMotion: saved.reducedMotion === true, server: typeof saved.server === 'string' ? saved.server : '' });
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive) setSystemMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemMotion);
    return () => { alive = false; subscription.remove(); };
  }, []);
  const update = (value: Partial<Preferences>) => setPreferences((current) => {
    const next = { ...current, ...value };
    void saveStored('lastflame.preferences', next);
    return next;
  });
  return <Context.Provider value={{ preferences, update, reducedMotion: preferences.reducedMotion || systemMotion }}>{children}</Context.Provider>;
}

export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error('PreferencesProvider is required.');
  return context;
}
