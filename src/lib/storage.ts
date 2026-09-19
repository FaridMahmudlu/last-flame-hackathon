import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function readStored<T>(key: string, fallback: T, session = false): Promise<T> {
  try {
    const raw = Platform.OS === 'web'
      ? (typeof window === 'undefined' ? null : (session ? window.sessionStorage : window.localStorage).getItem(key))
      : await SecureStore.getItemAsync(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}

export async function saveStored(key: string, value: unknown, session = false): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const store = session ? window.sessionStorage : window.localStorage;
      if (value === null) store.removeItem(key);
      else store.setItem(key, JSON.stringify(value));
    } else if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch { return; }
}
