import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { PreferencesProvider } from './src/state/Preferences';
import { GameProvider, useGame } from './src/state/GameProvider';
import { colors, fonts } from './src/theme';
import { AmbientBackground, Badge, Body, Button, IconButton, Notice, Sheet } from './src/components/ui';
import { FlameMark } from './src/components/art';
import { HowToPlay, Settings } from './src/components/Overlays';
import { HomeScreen } from './src/screens/HomeScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';

class RecoveryBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Last Flame render error:', error.message); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.recovery}><FlameMark size={50} /><Text style={styles.recoveryTitle}>The light flickered.</Text><Text style={styles.recoveryText}>Something interrupted the game screen. Return to the fireside and reconnect to your room.</Text><Pressable accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={styles.recoveryButton}><Text style={{ color: colors.ink }}>Return to the fireside</Text></Pressable></View>;
  }
}

function GameApp() {
  const game = useGame();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState<'home' | 'create' | 'join'>('home');
  const [inviteCode, setInviteCode] = useState('');
  const [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState(false);
  const view = game.view;
  const leave = useCallback(() => { setLeavePrompt(false); setPage('home'); void game.leave(); }, [game]);
  const back = useCallback(() => {
    if (view) {
      if (view.phase === 'won' || view.phase === 'lost') leave();
      else setLeavePrompt(true);
    } else setPage('home');
  }, [leave, view]);
  useEffect(() => {
    const handle = ({ url }: { url: string }) => {
      try {
        const code = new URL(url).searchParams.get('room')?.toUpperCase();
        if (code && /^[A-HJ-NP-Z2-9]{6}$/.test(code)) { setInviteCode(code); setPage('join'); }
      } catch { return; }
    };
    void Linking.getInitialURL().then((url) => { if (url) handle({ url }); });
    const listener = Linking.addEventListener('url', handle);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!view && page === 'home') return false;
      back(); return true;
    });
    return () => listener.remove();
  }, [back, page, view]);
  const canBack = page !== 'home' || !!view;
  return <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
    <AmbientBackground />
    <View style={styles.header}><View style={styles.brandSide}>{canBack && <IconButton icon="arrowLeft" label="Back to the fireside" onPress={back} />}<FlameMark size={23} />{(!canBack || width >= 360) && <Text style={styles.wordmark}>LAST FLAME</Text>}</View><View style={styles.headerActions}>{view?.practice ? <Badge color={colors.muted}>PRACTICE</Badge> : view ? <Badge icon={game.connection === 'connected' ? 'wifi' : 'offline'} color={game.connection === 'connected' ? colors.green : colors.danger}>{game.connection === 'connected' ? 'LIVE' : 'RECONNECTING'}</Badge> : <IconButton icon="help" label="How to play" onPress={() => setHelp(true)} />}<IconButton icon="settings" label="Settings" onPress={() => setSettings(true)} /></View></View>
    {game.error && <View style={styles.error}><Notice danger onDismiss={game.clearError}>{game.error}</Notice></View>}
    {view ? view.phase === 'lobby' ? <LobbyScreen /> : view.phase === 'playing' ? <GameScreen /> : <ResultScreen onHome={leave} /> : page === 'home' ? <HomeScreen onNavigate={setPage} onHelp={() => setHelp(true)} /> : <SetupScreen key={page} mode={page} initialCode={inviteCode} />}
    <HowToPlay visible={help} onClose={() => setHelp(false)} />
    {settings && <Settings visible onClose={() => setSettings(false)} />}
    <Sheet visible={leavePrompt} title="Leave the circle?" subtitle={view?.practice ? 'This practice run will end. You can start a fresh escape whenever you like.' : 'Your teammates can continue without you. Leaving gives up your place in this escape.'} onClose={() => setLeavePrompt(false)}><Body muted>{view?.practice ? 'The house will still be here.' : 'If you just lost your connection, stay here instead. Your explorer will reconnect automatically.'}</Body><Button label="Keep my flame burning" icon="flame" onPress={() => setLeavePrompt(false)} /><Button label="Leave this escape" kind="danger" icon="logout" onPress={leave} /></Sheet>
  </SafeAreaView>;
}

export default function App() {
  const [loaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, CormorantGaramond_600SemiBold });
  return <SafeAreaProvider><PreferencesProvider><StatusBar style="light" /><RecoveryBoundary>{!loaded && !fontError ? <View style={styles.loading}><FlameMark size={46} /><ActivityIndicator size="small" color={colors.amber} /></View> : <GameProvider><GameApp /></GameProvider>}</RecoveryBoundary></PreferencesProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 20, minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  brandSide: { flexDirection: 'row', gap: 10, alignItems: 'center', flexShrink: 1 },
  wordmark: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2.3, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  error: { paddingHorizontal: 24, paddingBottom: 10, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 25 },
  recovery: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 22 },
  recoveryTitle: { color: colors.text, fontSize: 30 },
  recoveryText: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 24, maxWidth: 380 },
  recoveryButton: { backgroundColor: colors.amber, padding: 18, borderRadius: 14 },
});
