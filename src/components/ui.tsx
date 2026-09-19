import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAnimatedValue } from '../lib/useAnimatedValue';
import type { StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import BookOpen from 'lucide-react-native/icons/book-open';
import Check from 'lucide-react-native/icons/check';
import CheckCheck from 'lucide-react-native/icons/check-check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import Compass from 'lucide-react-native/icons/compass';
import Copy from 'lucide-react-native/icons/copy';
import DoorOpen from 'lucide-react-native/icons/door-open';
import Ear from 'lucide-react-native/icons/ear';
import Eye from 'lucide-react-native/icons/eye';
import Flame from 'lucide-react-native/icons/flame';
import Ghost from 'lucide-react-native/icons/ghost';
import HeartHandshake from 'lucide-react-native/icons/heart-handshake';
import KeyRound from 'lucide-react-native/icons/key-round';
import Layers from 'lucide-react-native/icons/layers';
import Link from 'lucide-react-native/icons/link';
import LoaderCircle from 'lucide-react-native/icons/loader-circle';
import LockKeyhole from 'lucide-react-native/icons/lock-keyhole';
import LogOut from 'lucide-react-native/icons/log-out';
import Moon from 'lucide-react-native/icons/moon';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Radio from 'lucide-react-native/icons/radio';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Send from 'lucide-react-native/icons/send';
import Settings2 from 'lucide-react-native/icons/settings-2';
import Shield from 'lucide-react-native/icons/shield';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Timer from 'lucide-react-native/icons/timer';
import Users from 'lucide-react-native/icons/users';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import WandSparkles from 'lucide-react-native/icons/wand-sparkles';
import Wifi from 'lucide-react-native/icons/wifi';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';
import { usePreferences } from '../state/Preferences';

const icons = { arrowLeft: ArrowLeft, arrowRight: ArrowRight, audio: AudioLines, book: BookOpen, check: Check, checks: CheckCheck, chevron: ChevronRight, help: CircleHelp, compass: Compass, copy: Copy, door: DoorOpen, ear: Ear, eye: Eye, flame: Flame, ghost: Ghost, rescue: HeartHandshake, key: KeyRound, layers: Layers, link: Link, loader: LoaderCircle, lock: LockKeyhole, logout: LogOut, moon: Moon, pause: Pause, play: Play, plus: Plus, radio: Radio, replay: RotateCcw, send: Send, settings: Settings2, shield: Shield, sparkles: Sparkles, timer: Timer, users: Users, sound: Volume2, mute: VolumeX, wand: WandSparkles, wifi: Wifi, offline: WifiOff, close: X };
export type IconName = keyof typeof icons;
export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  const Component = icons[name];
  return <Component size={size} color={color} strokeWidth={1.7} />;
}
export function Body({ children, muted = false, small = false, style, ...props }: TextProps & { muted?: boolean; small?: boolean }) {
  return <Text {...props} style={[styles.body, small && styles.small, muted && { color: colors.muted }, style]}>{children}</Text>;
}
export function Eyebrow({ children, color = colors.amber, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, { color }, style]}>{children}</Text>;
}
export function Heading({ children, size = 40, style }: { children: React.ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text accessibilityRole="header" style={[styles.heading, { fontSize: size, lineHeight: size * 1.06 }, style]}>{children}</Text>;
}
export function Button({ label, onPress, icon, kind = 'primary', loading = false, disabled = false, compact = false, style, testID }: { label: string; onPress: () => void; icon?: IconName; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean; compact?: boolean; style?: StyleProp<ViewStyle>; testID?: string }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const foreground = kind === 'primary' ? colors.ink : kind === 'danger' ? colors.danger : colors.text;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: inactive, busy: loading }} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} disabled={inactive} style={({ pressed }) => [styles.button, styles[kind], compact && styles.compactButton, (pressed || hovered) && !inactive && { opacity: 0.86 }, focused && { borderColor: colors.text }, inactive && { opacity: 0.42 }, style]}>
    {loading ? <ActivityIndicator color={foreground} size="small" /> : icon ? <Icon name={icon} color={foreground} size={18} /> : null}
    <Text style={[styles.buttonLabel, { color: foreground }, compact && { fontSize: 12 }]}>{label}</Text>
  </Pressable>;
}
export function IconButton({ icon, label, onPress, color = colors.muted }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  const [hovered, setHovered] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={({ pressed }) => [styles.iconButton, (pressed || hovered) && { backgroundColor: colors.elevated }]}><Icon name={icon} color={color} /></Pressable>;
}
export function Badge({ children, icon, color = colors.amber }: { children: React.ReactNode; icon?: IconName; color?: string }) {
  return <View style={[styles.badge, { borderColor: `${color}30`, backgroundColor: `${color}0C` }]}>{icon && <Icon name={icon} color={color} size={13} />}<Text style={[styles.badgeLabel, { color }]}>{children}</Text></View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Field({ label, help, ...props }: TextInputProps & { label: string; help?: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 9 }}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }} placeholderTextColor={colors.subtle} selectionColor={colors.amber} style={[styles.input, focused && { borderColor: colors.amber }, props.style]} />{help && <Body muted small>{help}</Body>}</View>;
}
export function Notice({ children, danger = false, onDismiss }: { children: React.ReactNode; danger?: boolean; onDismiss?: () => void }) {
  return <View accessibilityLiveRegion="polite" style={[styles.notice, danger && { borderColor: `${colors.danger}45`, backgroundColor: '#291F24' }]}><Icon name={danger ? 'help' : 'radio'} color={danger ? colors.danger : colors.blue} size={18} /><Body small style={{ flex: 1, color: danger ? colors.danger : colors.blue }}>{children}</Body>{onDismiss && <IconButton icon="close" label="Dismiss message" onPress={onDismiss} />}</View>;
}
export function Page({ children, style, scroll = true, footer }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; scroll?: boolean; footer?: React.ReactNode }) {
  const { reducedMotion } = usePreferences();
  const opacity = useAnimatedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 260, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);
  const content = <Animated.View style={[styles.page, { opacity }, style]}>{children}</Animated.View>;
  return scroll ? <View style={{ flex: 1 }}><ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>{content}</ScrollView>{footer}</View> : content;
}
export function Divider({ label }: { label?: string }) {
  return <View style={styles.divider}><View style={styles.line} />{label && <Eyebrow color={colors.subtle} style={{ fontSize: 9 }}>{label}</Eyebrow>}<View style={styles.line} /></View>;
}
export function Sheet({ title, subtitle, visible, onClose, children, error }: { title: string; subtitle?: string; visible: boolean; onClose: () => void; children: React.ReactNode; error?: string | null }) {
  const { reducedMotion } = usePreferences();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeading}><View style={{ flex: 1, gap: 6 }}><Heading size={33}>{title}</Heading>{subtitle && <Body small muted>{subtitle}</Body>}</View><IconButton icon="close" label="Close dialog" onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 4 }}>{error && <Notice danger>{error}</Notice>}{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export function AmbientBackground() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}><LinearGradient colors={['#152433', '#0B1118', '#0B1118']} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} /><View style={styles.ambientGlow} /></View>;
}

const styles = StyleSheet.create({
  body: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  small: { fontSize: 12, lineHeight: 19 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.4, lineHeight: 17, textTransform: 'uppercase' },
  heading: { color: colors.text, fontFamily: fonts.display, letterSpacing: -0.6 },
  button: { minHeight: 54, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.small, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1 },
  primary: { backgroundColor: colors.amber, borderColor: colors.amber },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: '#2B2025', borderColor: '#63433F' },
  compactButton: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 10 },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center', flexShrink: 1 },
  iconButton: { width: 48, height: 48, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1 },
  badgeLabel: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.3 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 20 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundDeep, borderRadius: radius.small, paddingVertical: 17, paddingHorizontal: 16, minHeight: 56, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 15, paddingRight: 8, paddingVertical: 10, backgroundColor: '#162B34', borderColor: '#2D4653', borderWidth: 1, borderRadius: radius.small },
  page: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30, width: '100%', maxWidth: 1200, alignSelf: 'center', flexGrow: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 12 },
  line: { height: 1, flex: 1, backgroundColor: colors.border },
  modalRoot: { flex: 1, backgroundColor: '#03080DE0', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 60 },
  sheet: { width: '100%', maxWidth: 650, maxHeight: '92%', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  ambientGlow: { position: 'absolute', width: 430, height: 430, borderRadius: 215, right: -230, top: 150, backgroundColor: '#24425112' },
});
