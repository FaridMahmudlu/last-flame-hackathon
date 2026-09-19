import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CHAPTERS, RULES, SENSE_INFO, formatTime } from '../../shared/content';
import { SENSES } from '../../shared/types';
import type { Sense, Spot } from '../../shared/types';
import { remaining } from '../../shared/game';
import { useGame, useNow } from '../state/GameProvider';
import { useSounds } from '../lib/useSounds';
import { colors, fonts, playerColors } from '../theme';
import { Candle, Explorer } from '../components/art';
import { GameScene } from '../components/GameScene';
import { Badge, Body, Button, Card, Divider, Eyebrow, Heading, Icon, Notice, Page, Sheet } from '../components/ui';
import type { IconName } from '../components/ui';

type Panel = 'clue' | 'lock' | 'team' | 'notebook' | null;

export function GameScreen() {
  const game = useGame();
  const view = game.view!;
  const you = view.players.find((player) => player.id === view.youId)!;
  const now = useNow(game.offset);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [code, setCode] = useState('');
  const sounds = useSounds();
  const previousChapter = useRef(view.chapter);
  const chapter = CHAPTERS[view.chapter];
  const alive = you.status === 'alive';
  const moving = you.motion.endsAt > now;
  const online = view.practice || game.connection === 'connected';
  const disabled = game.pending || !online;
  const flame = remaining(you, now);
  const selectedSense = selected && SENSES.includes(selected as Sense) ? selected as Sense : null;
  const clue = view.clues.find((item) => item.sense === selectedSense);
  const ownsSelected = !!selectedSense && (you.senses.includes(selectedSense) || !!clue);
  const canBorrow = !!selectedSense && view.availableEchoes.includes(selectedSense);
  useEffect(() => {
    if (previousChapter.current !== view.chapter) {
      previousChapter.current = view.chapter;
      setPanel(null); setSelected(null); setCode('');
      sounds.playUnlock();
    }
  }, [view.chapter, sounds]);
  const explore = (spot: Spot) => {
    if (moving || disabled) return;
    setSelected(spot);
    setPanel(spot === 'door' ? 'lock' : 'clue');
    sounds.pulse();
    if (alive && you.spot !== spot) void game.send({ type: 'move', spot, chapter: view.chapter });
  };
  const inspect = () => { if (selectedSense) void game.send({ type: 'inspect', sense: selectedSense, chapter: view.chapter }); };
  const borrow = () => { if (selectedSense) void game.send({ type: 'echo', sense: selectedSense, chapter: view.chapter }); };
  const solve = async () => { const sent = await game.send({ type: 'solve', code, chapter: view.chapter }); if (sent) setCode(''); };
  const latestEvent = view.events.at(-1);
  const low = alive && flame <= 30_000;
  const controls = <View style={styles.dock}><View style={styles.dockRow}><Button label={`Notebook (${view.clues.length})`} icon="book" kind="secondary" compact style={{ flex: 1 }} onPress={() => setPanel('notebook')} /><Button label="Your team" icon="users" kind="secondary" compact style={{ flex: 1 }} onPress={() => setPanel('team')} /></View><Button label={view.chapter === 2 ? 'Open the final door' : 'Try the door'} icon="key" onPress={() => explore('door')} disabled={!alive || moving || disabled} testID="open-lock" /></View>;
  return <Page style={styles.page} footer={!wide ? <View style={styles.mobileDock}>{controls}</View> : undefined}>
    {!online && <View style={{ gap: 8 }}><Notice danger>The connection is interrupted. The house clock still runs. Your room will resync automatically.</Notice><Button label="Reconnect now" kind="secondary" compact onPress={() => { void game.resume(); }} /></View>}
    <View style={styles.teamStrip}>
      {view.players.map((player) => {
        const time = remaining(player, now);
        const captured = player.status === 'captured';
        return <Pressable key={player.id} onPress={() => setPanel('team')} accessibilityRole="button" accessibilityLabel={`${player.name}, ${captured ? 'in the mist' : `${formatTime(time)} of flame remaining`}. Open team actions.`} style={[styles.flameCard, player.id === view.youId && styles.yourFlame, view.practice && styles.soloFlame]}>
          <Candle size={view.practice ? 40 : 29} alive={!captured} fraction={time / (view.difficulty === 'relaxed' ? RULES.relaxedFlame : RULES.initialFlame)} color={playerColors[player.seat]} />
          <View style={{ alignItems: view.practice ? 'flex-start' : 'center', gap: 3, maxWidth: '100%', flexShrink: 1 }}><Text style={styles.playerName} numberOfLines={1}>{player.id === view.youId ? `${player.name} · You` : player.name}</Text><Text style={[styles.flameTime, { color: captured ? colors.blue : time < 30_000 ? colors.danger : playerColors[player.seat] }]}>{captured ? 'IN MIST' : formatTime(time)}</Text></View>
          {view.practice && <Badge icon="eye" color={colors.muted}>ALL FOUR SENSES</Badge>}
        </Pressable>;
      })}
    </View>
    <View style={[styles.main, wide && styles.wideMain]}>
      <View style={[styles.mapColumn, wide && { flex: 1.2 }]}>
        <View style={styles.chapterHeading}><View style={{ flex: 1, gap: 5 }}><Eyebrow>CHAPTER {chapter.numeral} OF III</Eyebrow><Heading size={39}>{chapter.name}</Heading></View><View style={styles.threat}><Icon name="ghost" size={16} color={colors.blue} /><Text style={styles.threatText}>Mist in {formatTime(view.nextHauntAt - now)}</Text></View></View>
        {!view.practice && <View style={styles.senseRow}>{you.senses.map((sense) => <Badge key={sense} icon={SENSE_INFO[sense].symbol as IconName} color={SENSE_INFO[sense].color}>Your {SENSE_INFO[sense].name.toLowerCase()}</Badge>)}</View>}
        <View style={styles.progress}>{CHAPTERS.map((item, i) => <View key={item.id} style={[styles.progressPart, { backgroundColor: i <= view.chapter ? colors.amber : colors.border }]} />)}</View>
        <GameScene view={view} offset={game.offset} selected={selected} onSpot={explore} disabled={disabled || moving || !alive} />
        <View style={styles.sceneFoot}><Icon name="compass" size={13} color={colors.subtle} /><Body small muted style={{ fontSize: 11 }}>Tap an object to walk over. Examine it with your sense.</Body></View>
      </View>
      <View style={[styles.sideColumn, wide && { flex: 0.85 }]}>
        <Card style={styles.objective}><Eyebrow color={colors.subtle}>YOUR WAY FORWARD</Eyebrow><Body style={{ fontFamily: fonts.medium }}>{chapter.objective}</Body><View style={styles.senseRow}>{you.senses.map((sense) => <Badge key={sense} icon={SENSE_INFO[sense].symbol as IconName} color={SENSE_INFO[sense].color}>{SENSE_INFO[sense].name}</Badge>)}</View><Body small muted>{view.practice ? 'You carry every sense in practice. Collect the three numbers and the order, then walk to the door.' : 'Only your senses reveal your clues. Share what you find with the team.'}</Body></Card>
        {!alive && <Notice>You are in the mist, but still on the team. Share clues you remember. If anyone escapes, you win too.</Notice>}
        {low && <Notice danger>Your flame is almost out. Ask for light, or make your next move count.</Notice>}
        {wide && controls}
        <View style={styles.rescueBadge}><Icon name="rescue" size={16} color={view.rescueUsed ? colors.subtle : colors.green} /><Body small muted>{view.rescueUsed ? 'The team rescue has been used.' : 'One rescue remains for your whole team.'}</Body></View>
        {latestEvent && <View style={styles.event}><View style={[styles.eventDot, { backgroundColor: latestEvent.kind === 'danger' ? colors.danger : colors.amber }]} /><Body small muted style={{ flex: 1 }} accessibilityLiveRegion="polite">{latestEvent.text}</Body></View>}
      </View>
    </View>

    <Sheet visible={panel === 'clue'} title={selectedSense ? chapter.spots[selectedSense] : 'A quiet corner'} subtitle={selectedSense ? `${SENSE_INFO[selectedSense].name} reveals this secret.` : undefined} onClose={() => setPanel(null)} error={game.error}>
      {clue ? <>
        <ClueDisplay sense={clue.sense} value={clue.value} order={clue.order} chapter={view.chapter} />
        <Body testID="clue-text">{clue.text}</Body>
        {clue.sense === 'hearing' && <><Button label={sounds.playing ? 'Listening to the pattern…' : 'Listen to the pattern'} kind="secondary" icon="sound" disabled={sounds.playing} onPress={() => sounds.playKnocks(clue.value ?? 1)} /><Body small muted>{sounds.available ? 'The written transcript above is always available. Sound is optional.' : 'Sound is unavailable here. Use the written transcript above.'}</Body></>}
        {!view.practice && <Button label="Share clue with team" icon="send" onPress={() => { void game.send({ type: 'share-clue', sense: clue.sense, chapter: view.chapter }); }} disabled={disabled} />}
        <Button label="Back to the room" kind="secondary" icon="arrowLeft" onPress={() => setPanel(null)} />
      </> : ownsSelected ? <>
        <View style={styles.mystery}><Icon name={selectedSense ? SENSE_INFO[selectedSense].symbol as IconName : 'eye'} size={46} color={selectedSense ? SENSE_INFO[selectedSense].color : colors.amber} /><Heading size={29}>There is more than meets the eye.</Heading><Body small muted style={{ textAlign: 'center' }}>{moving ? 'You are making your way across the room.' : 'Take a closer look. Your sense can reveal what the others cannot.'}</Body></View>
        <Button label={moving ? 'Walking to the object…' : 'Examine the clue'} icon="eye" loading={moving} disabled={!alive || moving || disabled || you.spot !== selectedSense} onPress={inspect} testID="examine-clue" />
        {!alive && <Body small muted>You cannot discover new clues from the mist. Your living teammates can borrow this sense.</Body>}
      </> : <>
        <View style={styles.mystery}><Icon name={canBorrow ? 'ghost' : 'lock'} size={42} color={canBorrow ? colors.blue : colors.subtle} /><Heading size={30}>{canBorrow ? 'A voice beyond the mist.' : 'Someone else holds this piece.'}</Heading><Body muted style={{ textAlign: 'center' }}>{canBorrow ? 'The owner of this sense is unavailable. Spend 20 seconds of your own flame to reveal its clue for this room.' : `Ask ${view.players.filter((player) => player.senses.includes(selectedSense!)).map((player) => player.name).join(' or ')} to examine this clue and share what they find.`}</Body></View>
        {canBorrow && <Button label="Borrow this echo (20s)" icon="ghost" disabled={!alive || flame <= RULES.echoCost || disabled} onPress={borrow} />}
        <Button label="Open team signals" icon="users" kind="secondary" onPress={() => setPanel('team')} />
      </>}
    </Sheet>

    <Sheet visible={panel === 'lock'} title={view.chapter === 2 ? 'The last door.' : 'A lock with a memory.'} subtitle="Three digits. The right order. A little trust." onClose={() => setPanel(null)} error={game.error}>
      <View style={styles.lockIllustration}><Icon name="lock" color={colors.amber} size={32} /><View style={styles.lockLine} /><Eyebrow color={colors.subtle}>BRIAR LOCK No. 0{view.chapter + 1}</Eyebrow><View style={styles.lockLine} /></View>
      <TextInput testID="door-code" accessibilityLabel="Three-digit door code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" inputMode="numeric" maxLength={3} placeholder="— — —" placeholderTextColor={colors.subtle} selectionColor={colors.amber} style={styles.codeInput} editable={alive && !disabled} onSubmitEditing={() => { if (code.length === 3 && !moving) void solve(); }} />
      {latestEvent?.kind === 'danger' && <Notice danger>{latestEvent.text}</Notice>}
      <View style={styles.lockCosts}><Body small muted>Correct code <Text style={{ color: colors.success }}>+30s</Text></Body><Body small muted>Wrong code <Text style={{ color: colors.danger }}>−15s to living flames</Text></Body></View>
      <Button label={moving ? 'Walking to the door…' : 'Turn the key'} icon="key" loading={moving || game.pending} disabled={!alive || moving || disabled || code.length !== 3 || you.spot !== 'door'} onPress={() => { void solve(); }} testID="solve-code" />
      <Divider label="CLUES YOU HAVE FOUND" />
      {view.clues.length ? view.clues.map((item) => <View key={item.sense} style={styles.notebookRow}><Icon name={SENSE_INFO[item.sense].symbol as IconName} color={SENSE_INFO[item.sense].color} size={18} /><Body small muted style={{ flex: 1 }}>{item.text}</Body></View>) : <Body small muted>Your notebook is empty. Explore the room, or ask your teammates for their clues.</Body>}
      {!view.practice && <Button label="Read team signals" icon="users" kind="ghost" onPress={() => setPanel('team')} />}
    </Sheet>

    <Sheet visible={panel === 'notebook'} title="Your field notes." subtitle="Only clues you have discovered or borrowed appear here." onClose={() => setPanel(null)} error={game.error}>
      {SENSES.map((sense) => {
        const found = view.clues.find((item) => item.sense === sense);
        const owner = view.players.find((item) => item.senses.includes(sense));
        return <Pressable key={sense} accessibilityRole="button" accessibilityLabel={`Read ${SENSE_INFO[sense].name} clue`} onPress={() => { setSelected(sense); setPanel('clue'); if (alive && !moving && you.spot !== sense && you.senses.includes(sense)) void game.send({ type: 'move', spot: sense, chapter: view.chapter }); }} style={styles.notebookCard}><Icon name={SENSE_INFO[sense].symbol as IconName} color={SENSE_INFO[sense].color} /><View style={{ flex: 1, gap: 5 }}><Text style={styles.noteTitle}>{chapter.spots[sense]}</Text><Body small muted>{found ? found.text : view.availableEchoes.includes(sense) ? 'An echo can reveal this clue for 20 seconds.' : `Still undiscovered. ${owner?.name ?? 'Your team'} holds this sense.`}</Body></View><Icon name={found ? 'check' : 'chevron'} size={16} color={found ? colors.success : colors.subtle} /></Pressable>;
      })}
    </Sheet>

    <Sheet visible={panel === 'team'} title="Keep each other alight." subtitle={view.practice ? 'Solo practice gives you all four senses. Invite friends from the home screen to share a real escape.' : 'Give a little light. Share a clue. No one has to leave alone.'} onClose={() => setPanel(null)} error={game.error}>
      {view.players.map((player) => <Card key={player.id} style={{ gap: 14, padding: 15 }}><View style={styles.teamRow}><Explorer size={35} color={playerColors[player.seat]} ghost={player.status === 'captured'} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.noteTitle}>{player.name}{player.id === view.youId ? ' · You' : ''}</Text><Body small muted>{!player.connected ? 'Reconnecting' : player.status === 'captured' ? 'In the mist. Still part of your team.' : `${formatTime(remaining(player, now))} of light remaining`}</Body></View></View>{player.id !== view.youId && alive && (player.status === 'alive' ? <Button label={`Give ${player.name} 20s`} kind="secondary" icon="flame" compact disabled={disabled || !player.connected || flame <= RULES.shareAmount || remaining(player, now) + RULES.shareAmount > RULES.maxFlame} onPress={() => { void game.send({ type: 'share', targetId: player.id }); }} /> : <Button label={view.rescueUsed ? 'The team rescue is spent' : `Rescue ${player.name} (40s)`} icon="rescue" compact disabled={disabled || view.rescueUsed || !player.connected || flame <= RULES.rescueCost} onPress={() => { void game.send({ type: 'rescue', targetId: player.id }); }} />)}</Card>)}
      {!view.practice && <><Divider label="QUICK SIGNALS" /><View style={styles.signals}>{([{ id: 'help', label: 'Need light', icon: 'flame' }, { id: 'door', label: 'At the door', icon: 'door' }, { id: 'wait', label: 'One moment', icon: 'timer' }, { id: 'ready', label: 'Ready to go', icon: 'check' }] as const).map((signal) => <Button key={signal.id} label={signal.label} icon={signal.icon} kind="secondary" compact style={{ width: '47%', flexGrow: 1 }} disabled={disabled} onPress={() => { void game.send({ type: 'signal', signal: signal.id }); }} />)}</View></>}
      <Divider label="THE TEAM JOURNAL" />
      {view.events.slice(-10).reverse().map((event) => <View key={event.id} style={styles.journalEntry}><Icon name={event.kind === 'clue' ? 'book' : event.kind === 'danger' ? 'ghost' : 'flame'} size={14} color={event.kind === 'danger' ? colors.danger : colors.subtle} /><Body small muted style={{ flex: 1 }}>{event.text}</Body></View>)}
    </Sheet>
  </Page>;
}

function ClueDisplay({ sense, value, order, chapter }: { sense: Sense; value?: number; order?: Sense[]; chapter: number }) {
  const color = SENSE_INFO[sense].color;
  return <View style={[styles.clueDisplay, { borderColor: `${color}50` }]}>
    <Eyebrow color={color}>{sense === 'instinct' ? 'THE LOCK’S ORDER' : sense === 'reading' ? 'A REFLECTION OF THE PAST' : sense === 'hearing' ? 'LISTEN BETWEEN THE SILENCES' : 'COUNT ONLY THE MARKED ONES'}</Eyebrow>
    {sense === 'instinct' ? <View style={styles.orderRow}>{order?.map((item, index) => <View key={item} style={styles.orderItem}><Text style={styles.orderNumber}>0{index + 1}</Text><Icon name={SENSE_INFO[item].symbol as IconName} size={27} color={SENSE_INFO[item].color} /><Body small>{SENSE_INFO[item].name}</Body></View>)}</View>
      : sense === 'reading' ? <Text accessibilityLabel={`Inscription ${chapter === 0 ? '184' : chapter === 1 ? '27' : '9'}${value}`} style={styles.mirrored}>{chapter === 0 ? '184' : chapter === 1 ? '27' : '9'}{value}</Text>
      : sense === 'hearing' ? <View style={styles.waveform}>{Array.from({ length: 27 }, (_, i) => <View key={i} style={{ height: 8 + ((i * 7 + (value ?? 1)) % 13) * 4, width: 4, borderRadius: 3, backgroundColor: color, opacity: i % 4 === 0 ? 0.4 : 0.8 }} />)}</View>
      : <View style={styles.markedObjects}>{Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.markedObject, { borderColor: index < (value ?? 0) ? color : colors.border, opacity: index < (value ?? 0) ? 1 : 0.3 }]}><Icon name={chapter === 0 ? 'eye' : chapter === 1 ? 'book' : 'flame'} size={22} color={index < (value ?? 0) ? color : colors.subtle} />{index < (value ?? 0) && <View style={[styles.seal, { backgroundColor: color }]} />}</View>)}</View>}
  </View>;
}

const styles = StyleSheet.create({
  page: { gap: 17, paddingTop: 8 },
  mobileDock: { paddingHorizontal: 24, paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  teamStrip: { flexDirection: 'row', gap: 7 },
  flameCard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 3, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15 },
  yourFlame: { backgroundColor: '#24271F', borderColor: '#655940' },
  soloFlame: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 17, gap: 12 },
  playerName: { color: colors.muted, fontFamily: fonts.medium, fontSize: 9, maxWidth: '100%' },
  flameTime: { fontFamily: fonts.semibold, fontSize: 12, fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  main: { gap: 17 },
  wideMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  mapColumn: { gap: 10 },
  sideColumn: { gap: 14 },
  chapterHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threat: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#182B35', padding: 9, borderRadius: 10 },
  threatText: { color: colors.blue, fontFamily: fonts.medium, fontSize: 10, fontVariant: ['tabular-nums'] },
  progress: { flexDirection: 'row', gap: 5, marginBottom: 3 },
  progressPart: { height: 2, borderRadius: 1, flex: 1 },
  sceneFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  objective: { gap: 12, padding: 18 },
  senseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  dock: { gap: 9 },
  dockRow: { flexDirection: 'row', gap: 9 },
  rescueBadge: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  event: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', paddingHorizontal: 4 },
  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 8 },
  mystery: { alignItems: 'center', gap: 18, paddingVertical: 28 },
  lockIllustration: { flexDirection: 'row', gap: 13, alignItems: 'center', paddingVertical: 6 },
  lockLine: { flex: 1, height: 1, backgroundColor: colors.border },
  codeInput: { minHeight: 95, borderWidth: 1, borderColor: '#796343', backgroundColor: colors.backgroundDeep, borderRadius: 16, color: colors.amber, fontSize: 39, fontFamily: fonts.semibold, letterSpacing: 18, textAlign: 'center', paddingLeft: 18, paddingVertical: 20 },
  lockCosts: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' },
  notebookRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  notebookCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 17, borderRadius: 16, minHeight: 84 },
  noteTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 13 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  signals: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  journalEntry: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', paddingVertical: 3 },
  clueDisplay: { borderWidth: 1, borderRadius: 20, padding: 21, alignItems: 'center', gap: 24, backgroundColor: colors.backgroundDeep, minHeight: 190, justifyContent: 'center' },
  orderRow: { flexDirection: 'row', gap: 30, justifyContent: 'center' },
  orderItem: { alignItems: 'center', gap: 10 },
  orderNumber: { color: colors.subtle, fontSize: 10, fontFamily: fonts.medium, letterSpacing: 2 },
  mirrored: { color: colors.purple, fontFamily: fonts.display, fontSize: 76, letterSpacing: 7, transform: [{ scaleX: -1 }] },
  waveform: { flexDirection: 'row', height: 80, gap: 5, alignItems: 'center', justifyContent: 'center' },
  markedObjects: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, justifyContent: 'center', maxWidth: 230 },
  markedObject: { width: 43, height: 50, borderWidth: 2, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D2A33' },
  seal: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4, right: 4 },
});
