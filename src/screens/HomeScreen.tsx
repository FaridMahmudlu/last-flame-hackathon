import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../state/GameProvider';
import { colors, fonts } from '../theme';
import { HouseScene } from '../components/art';
import { Badge, Body, Button, Eyebrow, Heading, Icon, Page } from '../components/ui';

export function HomeScreen({ onNavigate, onHelp }: { onNavigate: (page: 'create' | 'join') => void; onHelp: () => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 800;
  const game = useGame();
  const demoOnly = process.env.EXPO_PUBLIC_DEMO_ONLY === '1';
  return <Page style={{ paddingTop: wide ? 38 : 6 }}>
    <View style={[styles.hero, wide && styles.wideHero]}>
      <View style={[styles.art, wide ? styles.wideArt : styles.mobileArt]}>
        <HouseScene height={wide ? 530 : 290} />
        <LinearGradient pointerEvents="none" colors={['transparent', '#0B1118E8']} style={styles.artGradient} />
        <View style={styles.houseLabel}><Icon name="moon" color={colors.amber} size={14} /><Text style={styles.houseLabelText}>BRIAR HOUSE</Text><View style={styles.labelLine} /><Text style={styles.houseLabelText}>CHAPTER ONE</Text></View>
      </View>
      <View style={[styles.copy, wide && styles.wideCopy]}>
        <Badge icon="flame">ONE ESCAPE SAVES EVERYONE</Badge>
        <Heading size={wide ? 76 : 55} style={{ marginTop: 19 }}>Keep the light.{ '\n' }Find the way.</Heading>
        <Body muted style={styles.description}>A house full of secrets. Four fading flames.{ '\n' }Find the clues. Trust your friends. Leave together.</Body>
        {demoOnly ? <View style={styles.actions}><Button label="Play the demo" icon="play" onPress={() => game.practice()} testID="play-solo" /><Body small muted>Hosted solo preview. The full 2–4 player co-op game is included in the source and runs with the supplied game server.</Body></View> : <><View style={styles.actions}><Button label="Create a room" icon="plus" onPress={() => onNavigate('create')} testID="create-room" /><Button label="Join a room" icon="key" kind="secondary" onPress={() => onNavigate('join')} testID="join-room" /></View><View style={styles.soloRow}><Button label="Try solo practice" icon="play" kind="ghost" onPress={() => game.practice()} testID="play-solo" /><Text style={styles.soloNote}>No connection needed</Text></View></>}
        {!demoOnly && game.resumeSession && <View style={styles.resume}><Body small muted>An unfinished escape?</Body><Button label={`Rejoin ${game.resumeSession.code}`} kind="secondary" icon="replay" compact loading={game.pending} onPress={() => { void game.resume(); }} /></View>}
      </View>
    </View>
    <View style={[styles.features, wide && { marginTop: 28 }]}>
      {[
        { icon: 'users' as const, title: '2–4 explorers', text: 'Better together' },
        { icon: 'eye' as const, title: 'Shared secrets', text: 'Every sense matters' },
        { icon: 'rescue' as const, title: 'One team rescue', text: 'Make it count' },
      ].map((feature) => <View key={feature.title} style={styles.feature}><Icon name={feature.icon} color={colors.amber} size={20} /><Text style={styles.featureTitle}>{feature.title}</Text><Text style={styles.featureText}>{feature.text}</Text></View>)}
    </View>
    <View style={styles.footer}><Eyebrow color={colors.subtle}>ATMOSPHERE, NOT JUMP SCARES.</Eyebrow><Button label="How to play" icon="help" kind="ghost" compact onPress={onHelp} /></View>
  </Page>;
}

const styles = StyleSheet.create({
  hero: { gap: 0 },
  wideHero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 26 },
  art: { overflow: 'hidden', position: 'relative', borderRadius: 26 },
  wideArt: { flex: 1.18, borderWidth: 1, borderColor: '#293D49', backgroundColor: '#14212B' },
  mobileArt: { marginHorizontal: -12, marginBottom: -19 },
  artGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 115 },
  houseLabel: { position: 'absolute', bottom: 28, left: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 9 },
  houseLabelText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.7 },
  labelLine: { flex: 1, height: 1, backgroundColor: '#5E665C60' },
  copy: { paddingTop: 8 },
  wideCopy: { flex: 1, paddingRight: 16 },
  description: { marginTop: 17, lineHeight: 24, fontSize: 14 },
  actions: { gap: 10, marginTop: 26, maxWidth: 420 },
  soloRow: { marginTop: 5, alignItems: 'center', maxWidth: 420 },
  soloNote: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 10, marginTop: -3 },
  resume: { marginTop: 18, gap: 8 },
  features: { flexDirection: 'row', marginTop: 32, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 24 },
  feature: { flex: 1, alignItems: 'center', paddingHorizontal: 3, gap: 8 },
  featureTitle: { fontFamily: fonts.medium, fontSize: 11, color: colors.text, textAlign: 'center' },
  featureText: { fontFamily: fonts.regular, fontSize: 10, color: colors.subtle, textAlign: 'center' },
  footer: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'space-between' },
});
