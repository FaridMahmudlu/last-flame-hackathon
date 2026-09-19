import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../../shared/content';
import { useGame } from '../state/GameProvider';
import { colors, fonts, playerColors } from '../theme';
import { Candle, Explorer } from '../components/art';
import { Badge, Body, Button, Card, Divider, Eyebrow, Heading, Icon, Page } from '../components/ui';

export function ResultScreen({ onHome }: { onHome: () => void }) {
  const game = useGame();
  const view = game.view!;
  const won = view.phase === 'won';
  const host = view.hostId === view.youId;
  const totalShared = view.players.reduce((sum, player) => sum + player.stats.shared, 0);
  const totalClues = view.players.reduce((sum, player) => sum + player.stats.clues, 0);
  const duration = (view.endedAt ?? view.serverNow) - (view.startedAt ?? view.serverNow);
  return <Page style={styles.page}>
    <View style={styles.intro}><View style={[styles.halo, { borderColor: won ? '#715A3745' : '#41647445', backgroundColor: won ? '#57402020' : '#243D4620' }]}><Candle size={96} alive={won} /><View style={styles.resultIcon}><Icon name={won ? 'door' : 'moon'} color={won ? colors.amber : colors.blue} size={20} /></View></View><Eyebrow color={won ? colors.amber : colors.blue}>{won ? 'THE WAY IS OPEN' : 'UNTIL THE NEXT LIGHT'}</Eyebrow><Heading size={57} style={{ textAlign: 'center' }}>{won ? 'You found\nthe way home.' : 'The light\nwill return.'}</Heading><Body muted style={styles.description}>{won ? view.practice ? 'Every secret uncovered. Every door unlocked. Your first escape is a story worth sharing.' : 'One explorer opened the final door. Everyone wins — even those who were caught by the mist.' : 'The last candle faded before the final door opened. Gather your circle and try a different way.'}</Body></View>
    <View style={styles.stats}>{[{ value: formatTime(duration), label: 'TIME IN THE HOUSE' }, { value: `${totalClues}`, label: 'CLUES UNCOVERED' }, { value: `${totalShared}s`, label: 'LIGHT SHARED' }].map((stat) => <View key={stat.label} style={styles.stat}><Text style={styles.statValue}>{stat.value}</Text><Text style={styles.statLabel}>{stat.label}</Text></View>)}</View>
    <Card style={{ gap: 16 }}><View style={styles.sectionHeading}><Eyebrow color={colors.muted}>YOUR CIRCLE</Eyebrow><Badge icon={won ? 'checks' : 'users'} color={won ? colors.green : colors.muted}>{won ? 'Everyone wins' : 'Together again'}</Badge></View>{view.players.map((player) => <View key={player.id} style={styles.player}><Explorer size={36} color={playerColors[player.seat]} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.name}>{player.name}{player.id === view.youId ? ' · You' : ''}</Text><Body small muted>{player.stats.doors ? `${player.stats.doors} door${player.stats.doors === 1 ? '' : 's'} opened` : `${player.stats.clues} clues found`}{player.stats.rescued ? ' · A friend brought back' : ''}</Body></View><Text style={[styles.status, { color: won ? colors.success : colors.blue }]}>{won ? 'ESCAPED' : 'IN THE MIST'}</Text></View>)}</Card>
    <View style={{ gap: 10 }}><Button label={view.practice ? 'Try another escape' : host ? 'Gather the team again' : 'Waiting for the host'} icon="replay" disabled={!view.practice && !host} loading={game.pending} onPress={() => { void game.send({ type: 'restart' }); }} testID="play-again" /><Button label="Return to the fireside" kind="secondary" icon="arrowLeft" onPress={onHome} /></View>
    <Divider /><Body small muted style={{ textAlign: 'center' }}>New combinations await next time. The house remembers the light you shared, not the mistakes you made.</Body>
  </Page>;
}
const styles = StyleSheet.create({
  page: { maxWidth: 650, gap: 24, paddingTop: 25 },
  intro: { alignItems: 'center', gap: 17 },
  halo: { width: 166, height: 166, borderRadius: 83, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  resultIcon: { position: 'absolute', right: 3, bottom: 14, padding: 9, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  description: { textAlign: 'center', maxWidth: 450 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 24, gap: 6 },
  stat: { flex: 1, alignItems: 'center', gap: 9 },
  statValue: { color: colors.amber, fontFamily: fonts.display, fontSize: 33 },
  statLabel: { fontSize: 8, fontFamily: fonts.medium, color: colors.subtle, letterSpacing: 0.8, textAlign: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  name: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  status: { fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 0.9 },
});
