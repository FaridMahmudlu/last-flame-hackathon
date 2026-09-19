import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Difficulty } from '../../shared/types';
import { useGame } from '../state/GameProvider';
import { usePreferences } from '../state/Preferences';
import { colors, fonts } from '../theme';
import { Candle } from '../components/art';
import { Badge, Body, Button, Card, Eyebrow, Field, Heading, Icon, Page } from '../components/ui';

export function SetupScreen({ mode, initialCode = '' }: { mode: 'create' | 'join'; initialCode?: string }) {
  const game = useGame();
  const { preferences } = usePreferences();
  const [name, setName] = useState(preferences.name);
  const [code, setCode] = useState(initialCode);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const creating = mode === 'create';
  const validName = /^[\p{L}\p{N} ._-]{2,18}$/u.test(name.trim());
  const validCode = /^[A-HJ-NP-Z2-9]{6}$/.test(code);
  const submit = () => { if (creating) void game.create(name, difficulty); else void game.join(name, code); };
  return <Page style={styles.page}>
    <View style={styles.intro}><Candle size={70} /><Eyebrow>THE CIRCLE BEGINS WITH YOU</Eyebrow><Heading size={49}>{creating ? 'Light the first flame.' : 'Find your circle.'}</Heading><Body muted style={{ textAlign: 'center', maxWidth: 360 }}>{creating ? 'Make a little room for the people you trust.\nThe house is waiting.' : 'Someone is keeping a light on for you.\nEnter their room code to join.'}</Body></View>
    <Card style={{ gap: 24 }}>
      <Field label="Your explorer name" placeholder="e.g. Alex" value={name} onChangeText={setName} maxLength={18} autoComplete="nickname" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => { if (validName && (creating || validCode)) submit(); }} help="2–18 characters. Your team will see this name." />
      {!creating && <Field label="Room code" placeholder="ABC234" value={code} onChangeText={(value) => setCode(value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6))} maxLength={6} autoCapitalize="characters" autoCorrect={false} style={styles.codeInput} help="Ask your host for the six-character code." />}
      {creating && <View style={{ gap: 12 }}><Body small style={{ fontFamily: fonts.medium }}>Choose your pace</Body><View style={styles.difficulties}>
        {([{ id: 'standard', label: 'Classic', time: '3-minute flame', note: 'A little more suspense' }, { id: 'relaxed', label: 'Unhurried', time: '5-minute flame', note: 'Room to learn together' }] as const).map((option) => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: difficulty === option.id }} accessibilityLabel={`${option.label}, ${option.time}`} onPress={() => setDifficulty(option.id)} style={[styles.difficulty, difficulty === option.id && styles.selected]}><View style={styles.optionHeading}><Icon name={option.id === 'standard' ? 'flame' : 'moon'} size={18} color={difficulty === option.id ? colors.amber : colors.subtle} />{difficulty === option.id && <Icon name="check" size={14} color={colors.amber} />}</View><Text style={styles.optionTitle}>{option.label}</Text><Body small muted>{option.time}</Body><Text style={styles.optionNote}>{option.note}</Text></Pressable>)}
      </View></View>}
      <Button label={creating ? 'Create my room' : 'Join the circle'} icon={creating ? 'plus' : 'arrowRight'} loading={game.pending || game.connection === 'connecting'} disabled={!validName || (!creating && !validCode)} onPress={submit} testID="submit-room" />
      <View style={{ alignItems: 'center' }}><Badge icon="shield" color={colors.muted}>Private room · No account required</Badge></View>
    </Card>
    <View style={styles.note}><Icon name="link" size={15} color={colors.subtle} /><Body small muted style={{ flex: 1 }}>Every player needs the same game server. Check Settings if your room cannot be reached.</Body></View>
  </Page>;
}
const styles = StyleSheet.create({
  page: { maxWidth: 540, gap: 25, paddingTop: 12 },
  intro: { alignItems: 'center', gap: 12, paddingBottom: 4 },
  codeInput: { fontFamily: fonts.semibold, letterSpacing: 7, fontSize: 27, textAlign: 'center', minHeight: 70 },
  difficulties: { flexDirection: 'row', gap: 10 },
  difficulty: { flex: 1, borderRadius: 14, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background, padding: 14, gap: 5 },
  selected: { borderColor: '#AD8755', backgroundColor: '#27251F' },
  optionHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  optionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  optionNote: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, marginTop: 3 },
  note: { flexDirection: 'row', gap: 10, paddingHorizontal: 8, alignItems: 'flex-start' },
});
