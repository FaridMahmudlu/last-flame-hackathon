import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SENSE_INFO } from '../../shared/content';
import { useGame } from '../state/GameProvider';
import { colors, fonts, playerColors } from '../theme';
import { Explorer } from '../components/art';
import { Badge, Body, Button, Card, Eyebrow, Heading, Icon, Page } from '../components/ui';
import type { IconName } from '../components/ui';

export function LobbyScreen() {
  const game = useGame();
  const view = game.view!;
  const you = view.players.find((player) => player.id === view.youId)!;
  const host = view.hostId === view.youId;
  const allReady = view.players.length >= 2 && view.players.every((player) => player.ready && player.connected);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copy = async (link = false) => {
    try {
      const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : game.server;
      await Clipboard.setStringAsync(link ? `${origin}/?room=${view.code}` : view.code);
      setCopied(true); setCopyFailed(false);
    } catch { setCopyFailed(true); }
  };
  return <Page style={styles.page}>
    <View style={styles.intro}><Eyebrow>BEFORE THE DOOR CLOSES</Eyebrow><Heading size={49}>Gather your circle.</Heading><Body muted>Your senses are different. Your way out is the same.</Body></View>
    <Card style={styles.codeCard}><View style={{ flex: 1, gap: 7 }}><Eyebrow color={colors.subtle}>YOUR ROOM CODE</Eyebrow><Text selectable testID="room-code" style={styles.code}>{view.code}</Text></View><Button label={copied ? 'Copied' : 'Copy code'} icon={copied ? 'check' : 'copy'} kind="secondary" compact onPress={() => { void copy(); }} /></Card>
    {copyFailed && <Body small style={{ color: colors.danger }}>Clipboard is unavailable. Select and copy the code above.</Body>}
    <View style={styles.sectionHeading}><Eyebrow color={colors.muted}>THE EXPLORERS</Eyebrow><Badge icon="users" color={colors.muted}>{view.players.length} / 4 joined</Badge></View>
    <View style={styles.players}>
      {[0, 1, 2, 3].map((seat) => {
        const player = view.players.find((item) => item.seat === seat);
        return <View key={seat} style={[styles.player, !player && styles.empty]}>{player ? <>
          <View style={styles.playerTop}><Explorer size={45} color={playerColors[seat]} /><View style={[styles.readyDot, { backgroundColor: player.ready && player.connected ? colors.success : colors.subtle }]} /></View>
          <View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{player.name}</Text>{player.id === view.youId && <Text style={styles.you}>YOU</Text>}</View>
          <Text style={styles.role}>{player.id === view.hostId ? 'Host · ' : ''}{!player.connected ? 'Reconnecting' : player.ready ? 'Ready to explore' : 'Getting ready'}</Text>
          <View style={styles.senses}>{player.senses.map((sense) => <View key={sense} style={styles.sense}><Icon name={SENSE_INFO[sense].symbol as IconName} size={13} color={SENSE_INFO[sense].color} /><Text style={[styles.senseLabel, { color: SENSE_INFO[sense].color }]}>{SENSE_INFO[sense].name}</Text></View>)}</View>
        </> : <View style={styles.emptyContent}><View style={styles.emptyIcon}><Icon name="plus" color={colors.subtle} /></View><Body small muted>Room for a friend</Body><Text style={styles.waiting}>Share your room code</Text></View>}</View>;
      })}
    </View>
    <Card style={styles.rules}><Icon name="flame" color={colors.amber} size={22} /><View style={{ flex: 1, gap: 6 }}><Body style={{ fontFamily: fonts.semibold }}>Different senses. One shared escape.</Body><Body small muted>Each explorer sees a different piece of the puzzle. Trade clues, share your flame, and save the team’s one rescue for when it matters.</Body></View></Card>
    <View style={{ gap: 10 }}>
      <Button label={you.ready ? 'Ready — tap to unready' : 'I am ready'} kind={you.ready ? 'secondary' : 'primary'} icon={you.ready ? 'checks' : 'check'} loading={game.pending} onPress={() => { void game.send({ type: 'ready', ready: !you.ready }); }} testID="ready-button" />
      {host ? <Button label="Enter Briar House" icon="door" disabled={!allReady || game.pending} onPress={() => { void game.send({ type: 'start' }); }} testID="start-game" /> : <Body small muted style={{ textAlign: 'center' }}>Your host will open the door when everyone is ready.</Body>}
      {host && !allReady && <Body small muted style={{ textAlign: 'center' }}>{view.players.length < 2 ? 'Invite at least one friend to start. Solo practice is on the home screen.' : 'Every explorer needs to be ready before you enter.'}</Body>}
      <Button label="Copy invite link" icon="link" kind="ghost" onPress={() => { void copy(true); }} />
    </View>
  </Page>;
}
const styles = StyleSheet.create({
  page: { maxWidth: 760, gap: 20, paddingTop: 24 },
  intro: { gap: 10 },
  codeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#20251F', borderColor: '#64563B' },
  code: { color: colors.amber, fontSize: 30, letterSpacing: 5, fontFamily: fonts.semibold },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  player: { width: '48%', flexGrow: 1, minHeight: 176, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  empty: { borderStyle: 'dashed', backgroundColor: '#101923' },
  playerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  readyDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, flexShrink: 1 },
  you: { fontFamily: fonts.semibold, fontSize: 8, color: colors.amber, letterSpacing: 1 },
  role: { fontFamily: fonts.regular, fontSize: 10, color: colors.subtle, marginTop: 5 },
  senses: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 12 },
  sense: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  senseLabel: { fontFamily: fonts.medium, fontSize: 10 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 9 },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  waiting: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 9 },
  rules: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
});
