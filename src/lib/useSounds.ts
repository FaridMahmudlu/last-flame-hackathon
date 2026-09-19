import { useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import knockSource from '../../assets/knock.wav';
import unlockSource from '../../assets/unlock.wav';
import { usePreferences } from '../state/Preferences';

export function useSounds() {
  const { preferences } = usePreferences();
  const knock = useRef<AudioPlayer | null>(null);
  const unlock = useRef<AudioPlayer | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => setAvailable(false));
    const knockPlayer = createAudioPlayer(knockSource);
    const unlockPlayer = createAudioPlayer(unlockSource);
    knockPlayer.volume = 0.7;
    unlockPlayer.volume = 0.55;
    knock.current = knockPlayer;
    unlock.current = unlockPlayer;
    const timers = timeouts.current;
    return () => { timers.forEach(clearTimeout); knockPlayer.remove(); unlockPlayer.remove(); knock.current = null; unlock.current = null; };
  }, []);
  const pulse = () => { if (preferences.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); };
  const playKnocks = (count: number) => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current.length = 0;
    setPlaying(true);
    for (let i = 0; i < count; i++) timeouts.current.push(setTimeout(() => {
      pulse();
      const player = knock.current;
      if (preferences.sound && player) void player.seekTo(0).then(() => player.play()).catch(() => setAvailable(false));
    }, i * 600));
    timeouts.current.push(setTimeout(() => setPlaying(false), count * 600));
  };
  const playUnlock = () => {
    pulse();
    const player = unlock.current;
    if (preferences.sound && player) void player.seekTo(0).then(() => player.play()).catch(() => setAvailable(false));
  };
  return { playing, available, playKnocks, playUnlock, pulse };
}
