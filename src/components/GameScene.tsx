import React, { memo, useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAnimatedValue } from '../lib/useAnimatedValue';
import { SENSE_INFO, SPOTS } from '../../shared/content';
import { SENSES } from '../../shared/types';
import type { GameView, PublicPlayer, Spot } from '../../shared/types';
import { usePreferences } from '../state/Preferences';
import { colors, fonts, playerColors } from '../theme';
import { Explorer, RoomArtwork } from './art';
import { Icon } from './ui';
import type { IconName } from './ui';

function MovingExplorer({ player, width, height, offset, you }: { player: PublicPlayer; width: number; height: number; offset: number; you: boolean }) {
  const { reducedMotion } = usePreferences();
  const x = useAnimatedValue(player.motion.from.x * width);
  const y = useAnimatedValue(player.motion.from.y * height);
  useEffect(() => {
    const now = Date.now() + offset;
    const motion = player.motion;
    const total = Math.max(1, motion.endsAt - motion.startedAt);
    const progress = Math.max(0, Math.min(1, (now - motion.startedAt) / total));
    const seatX = (player.seat - 1.5) * 9;
    x.setValue((motion.from.x + (motion.to.x - motion.from.x) * progress) * width + seatX);
    y.setValue((motion.from.y + (motion.to.y - motion.from.y) * progress) * height);
    const animation = Animated.parallel([
      Animated.timing(x, { toValue: motion.to.x * width + seatX, duration: reducedMotion ? 0 : Math.max(0, motion.endsAt - now), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(y, { toValue: motion.to.y * height, duration: reducedMotion ? 0 : Math.max(0, motion.endsAt - now), useNativeDriver: Platform.OS !== 'web' }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [height, offset, player.motion, player.seat, reducedMotion, width, x, y]);
  return <Animated.View pointerEvents="none" style={[styles.explorer, { transform: [{ translateX: x }, { translateY: y }], opacity: player.connected ? 1 : 0.45 }]}><Explorer size={32} color={playerColors[player.seat]} ghost={player.status === 'captured'} />{you && <Text style={styles.you}>YOU</Text>}</Animated.View>;
}

export const GameScene = memo(function GameScene({ view, offset, onSpot, selected, disabled = false }: { view: GameView; offset: number; onSpot: (spot: Spot) => void; selected: Spot | null; disabled?: boolean }) {
  const [size, setSize] = useState({ width: 400, height: 440 });
  return <View style={styles.scene} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
    <RoomArtwork chapter={view.chapter} />
    <View pointerEvents="none" style={styles.sceneCaption}><View style={styles.tinyDot} /><Text style={styles.sceneCaptionText}>TAP AN OBJECT TO EXPLORE</Text></View>
    {[...SENSES, 'door' as const].map((spot) => {
      const sense = spot === 'door' ? null : SENSE_INFO[spot];
      const position = SPOTS[spot];
      const found = view.clues.some((clue) => clue.sense === spot);
      const color = sense?.color ?? colors.amber;
      return <Pressable key={spot} testID={`spot-${spot}`} accessibilityRole="button" accessibilityLabel={spot === 'door' ? 'Walk to the locked door' : `Explore ${sense!.name} clue`} disabled={disabled} accessibilityState={{ disabled }} onPress={() => onSpot(spot)} style={({ pressed }) => [styles.hotspot, { left: `${position.x * 100}%`, top: `${position.y * 100 - 8}%`, borderColor: selected === spot ? color : `${color}65`, backgroundColor: selected === spot ? '#26343E' : '#101D28ED', opacity: pressed ? 0.72 : 1 }]}>
        <Icon name={spot === 'door' ? 'lock' : sense!.symbol as IconName} color={color} size={18} />
        {found && <View style={styles.found}><Icon name="check" size={9} color={colors.ink} /></View>}
      </Pressable>;
    })}
    {view.players.map((player) => <MovingExplorer key={player.id} player={player} width={size.width} height={size.height} offset={offset} you={player.id === view.youId} />)}
    <View pointerEvents="none" style={styles.roomLabel}><Text style={styles.roomLabelText}>BRIAR HOUSE</Text><View style={styles.roomLabelLine} /><Text style={styles.roomLabelText}>FLOOR 0{view.chapter + 1}</Text></View>
  </View>;
});

const styles = StyleSheet.create({
  scene: { width: '100%', aspectRatio: 400 / 430, maxHeight: 530, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#354852', backgroundColor: '#0B151D' },
  sceneCaption: { position: 'absolute', top: 17, left: 17, flexDirection: 'row', gap: 7, alignItems: 'center' },
  tinyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.amber },
  sceneCaptionText: { fontSize: 8, fontFamily: fonts.medium, color: colors.muted, letterSpacing: 1.2 },
  hotspot: { position: 'absolute', width: 48, height: 48, marginLeft: -24, marginTop: -24, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1.5, zIndex: 3 },
  found: { position: 'absolute', right: -4, top: -4, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  explorer: { position: 'absolute', left: -16, top: -33, zIndex: 2, alignItems: 'center' },
  you: { color: colors.text, fontSize: 7, fontFamily: fonts.bold, letterSpacing: 1.4, marginTop: -4, backgroundColor: '#0D1822C0', paddingHorizontal: 4, borderRadius: 3 },
  roomLabel: { position: 'absolute', left: 20, right: 20, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  roomLabelText: { color: '#8DA0AC', fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.8 },
  roomLabelLine: { flex: 1, height: 1, backgroundColor: '#354853' },
});
