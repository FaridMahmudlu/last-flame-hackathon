import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { SENSE_INFO } from '../../shared/content';
import { SENSES } from '../../shared/types';
import { useGame } from '../state/GameProvider';
import { usePreferences } from '../state/Preferences';
import { colors, fonts } from '../theme';
import { defaultServer } from '../lib/client';
import { Badge, Body, Button, Card, Divider, Eyebrow, Field, Icon, Notice, Sheet } from './ui';
import type { IconName } from './ui';

export function HowToPlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return <Sheet visible={visible} onClose={onClose} title="A little light goes a long way." subtitle="Three locked rooms. Up to four explorers. One shared way out.">
    {[
      { number: '01', title: 'Follow your senses.', text: 'Tap an object to walk to it, then examine it. Sight, Hearing, and Reading reveal a digit. Instinct reveals the order. With fewer players, you carry more senses.' },
      { number: '02', title: 'Keep each other alight.', text: 'Your candle is your time. Share 20 seconds with a friend. A correct door code gives living players 30 seconds; a wrong code costs each 15 seconds. The mist takes 10 seconds from the weakest flame every 45 seconds.' },
      { number: '03', title: 'No one is out of the story.', text: 'If your flame goes out, you are caught. Keep sharing clues you already found. The team can rescue one player, once: the rescuer pays 40 seconds and the returning player gets 60.' },
      { number: '04', title: 'One escape saves everyone.', text: 'Even if three players are caught, the last survivor can continue. Borrow an unavailable sense for 20 seconds per room. Open the final door and everyone wins. If every flame fades, the round ends.' },
    ].map((rule) => <View key={rule.number} style={styles.rule}><Badge>{rule.number}</Badge><View style={{ flex: 1, gap: 7 }}><Body style={{ fontFamily: fonts.semibold }}>{rule.title}</Body><Body small muted>{rule.text}</Body></View></View>)}
    <Divider label="FOUR WAYS TO NOTICE" />
    {SENSES.map((sense) => <View key={sense} style={styles.rule}><View style={[styles.senseIcon, { backgroundColor: `${SENSE_INFO[sense].color}14` }]}><Icon name={SENSE_INFO[sense].symbol as IconName} color={SENSE_INFO[sense].color} /></View><View style={{ flex: 1, gap: 5 }}><Body style={{ fontFamily: fonts.medium }}>{SENSE_INFO[sense].name}</Body><Body small muted>{SENSE_INFO[sense].description}</Body></View></View>)}
    <Notice>Sound clues always have a written transcript. No voice chat, microphone access, or jump scares are required.</Notice>
    <Button label="I am ready for the house" icon="flame" onPress={onClose} />
  </Sheet>;
}

export function Settings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { preferences, update } = usePreferences();
  const game = useGame();
  const [server, setServer] = useState(preferences.server || game.server);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saveServer = () => {
    try {
      const url = new URL(server.trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) throw new Error('Use the server origin, such as http://192.168.1.10:8787, without a path or credentials.');
      update({ server: url.origin === defaultServer() ? '' : url.origin });
      setSaved(true); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enter a valid game server address.'); }
  };
  return <Sheet visible={visible} onClose={onClose} title="Make yourself comfortable." subtitle="A little atmosphere, on your terms.">
    {[
      { key: 'sound' as const, icon: 'sound' as const, title: 'Sound effects', text: 'Soft knocks and the sound of a door opening.' },
      { key: 'haptics' as const, icon: 'radio' as const, title: 'Haptic feedback', text: 'Gentle feedback for actions and sound patterns.' },
      { key: 'reducedMotion' as const, icon: 'moon' as const, title: 'Reduced motion', text: 'Still candles and instant movement. Also follows your device preference.' },
    ].map((setting) => <View key={setting.key} style={styles.setting}><Icon name={setting.icon} color={colors.amber} /><View style={{ flex: 1, gap: 5 }}><Body style={{ fontFamily: fonts.medium }}>{setting.title}</Body><Body muted small>{setting.text}</Body></View><Switch accessibilityLabel={setting.title} value={preferences[setting.key]} onValueChange={(value) => update({ [setting.key]: value })} trackColor={{ false: colors.border, true: '#977445' }} thumbColor={preferences[setting.key] ? colors.amber : colors.muted} /></View>)}
    <Divider label="CONNECTION" />
    <Field label="Game server address" value={server} onChangeText={(value) => { setServer(value); setSaved(false); }} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!game.view} help={game.view ? 'Leave your current game before changing the server.' : 'All players need the same server. A physical phone needs your computer’s LAN address, not localhost.'} />
    {error && <Notice danger>{error}</Notice>}
    <View style={{ gap: 9 }}><Button label={saved ? 'Server address saved' : 'Save server address'} kind="secondary" icon={saved ? 'check' : 'wifi'} disabled={!!game.view} onPress={saveServer} /><Button label="Use automatic address" kind="ghost" icon="replay" disabled={!!game.view} onPress={() => { update({ server: '' }); setServer(defaultServer()); setSaved(true); setError(null); }} /></View>
    <Card style={{ gap: 8 }}><Eyebrow color={colors.subtle}>LAST FLAME · 1.0.0</Eyebrow><Body small muted>Solo practice works without a server. Online co-op uses a private room and an anonymous reconnect session. The clock continues while menus are open or the app is in the background.</Body><Body small muted>Internet hosting needs an HTTPS/WSS game server. No account, microphone recording, camera, or location access is used.</Body></Card>
  </Sheet>;
}
const styles = StyleSheet.create({
  rule: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  senseIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  setting: { flexDirection: 'row', gap: 13, alignItems: 'center', paddingVertical: 8 },
});
