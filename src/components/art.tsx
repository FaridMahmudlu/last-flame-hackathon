import React, { memo, useEffect, useId } from 'react';
import { Animated, Platform, View } from 'react-native';
import { useAnimatedValue } from '../lib/useAnimatedValue';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';
import { usePreferences } from '../state/Preferences';

export function FlameMark({ size = 28, color = colors.amber }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 32 40"><Path d="M17 1C20 10 29 14 29 24C29 32 23 38 15 38C7 38 2 32 2 25C2 19 7 14 9 9C10 13 11 16 13 17C17 13 19 7 17 1Z" fill={color} /><Path d="M17 18C16 23 21 25 21 29C21 33 19 35 16 35C12 35 10 32 10 29C10 24 14 22 17 18Z" fill="#FFF0CC" /></Svg>;
}

export function Candle({ size = 56, color = colors.amber, alive = true, fraction = 1, animated = true }: { size?: number; color?: string; alive?: boolean; fraction?: number; animated?: boolean }) {
  const id = useId().replace(/:/g, '');
  const { reducedMotion } = usePreferences();
  const flicker = useAnimatedValue(0.85);
  useEffect(() => {
    if (reducedMotion || !alive || !animated) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(flicker, { toValue: 1, duration: 850, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(flicker, { toValue: 0.76, duration: 1100, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [alive, animated, flicker, reducedMotion]);
  const height = 27 + Math.max(0, Math.min(1, fraction)) * 20;
  return <View style={{ width: size, height: size * 1.25 }} pointerEvents="none"><Animated.View style={{ opacity: alive ? flicker : 0.5 }}><Svg width={size} height={size * 1.25} viewBox="0 0 80 100">
    <Defs><RadialGradient id={`${id}glow`}><Stop stopColor={color} stopOpacity="0.32" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient><LinearGradient id={`${id}wax`} x1="0" y1="0" x2="1" y2="0"><Stop stopColor="#8A857A" /><Stop offset="0.45" stopColor="#DED3B7" /><Stop offset="1" stopColor="#A39880" /></LinearGradient></Defs>
    {alive && <Ellipse cx="40" cy={84 - height - 16} rx="39" ry="40" fill={`url(#${id}glow)`} />}
    <Ellipse cx="40" cy="90" rx="23" ry="5" fill="#080D12" />
    <Rect x="31" y={85 - height} width="18" height={height} rx="4" fill={alive ? `url(#${id}wax)` : '#667078'} />
    <Path d={`M 31 ${89 - height} Q 36 ${96 - height} 40 ${89 - height} Q 44 ${96 - height} 49 ${89 - height}`} fill="none" stroke="#F1E3C5" strokeWidth="2" opacity="0.7" />
    <Path d={`M40 ${85 - height}v-7`} stroke="#BAA18B" strokeWidth="2" />
    {alive ? <G transform={`translate(30 ${52 - height})`}><Path d="M11 0C13 8 20 12 20 19C20 25 16 30 10 30C4 30 0 25 0 20C0 14 7 9 11 0Z" fill={color} /><Path d="M11 12C12 17 15 18 15 22C15 26 13 28 10 28C6 28 5 25 5 22C5 19 9 16 11 12Z" fill="#FFF3D6" /></G> : <Path d={`M40 ${76 - height}q-7-6 0-12q7-6 0-12`} stroke="#9CB1BF" strokeWidth="2" fill="none" opacity="0.5" />}
    <Path d="M26 88H54" stroke="#9C805D" strokeWidth="3" strokeLinecap="round" />
  </Svg></Animated.View></View>;
}

export const Explorer = memo(function Explorer({ color = colors.amber, size = 46, ghost = false }: { color?: string; size?: number; ghost?: boolean }) {
  return <Svg width={size} height={size * 1.25} viewBox="0 0 48 60">
    <Ellipse cx="24" cy="54" rx="16" ry="4" fill="#03080B" opacity="0.5" />
    {ghost ? <G opacity="0.68"><Path d="M11 47V25C11 6 37 6 37 25V47L31 42L25 48L18 42Z" fill="#9ABFCD" /><Ellipse cx="19" cy="26" rx="2" ry="3" fill="#223843" /><Ellipse cx="29" cy="26" rx="2" ry="3" fill="#223843" /></G> : <G>
      <Path d="M16 42L14 53H21L24 44L27 53H34L32 42" fill="#27323A" />
      <Path d="M15 25L8 45Q24 54 40 45L33 25Z" fill={color} /><Path d="M25 26L24 49L40 45L33 25Z" fill="#17202C" opacity="0.32" />
      <Path d="M11 23C11 4 37 4 37 23Q35 36 24 36Q13 36 11 23Z" fill={color} />
      <Path d="M16 22Q24 11 32 22L31 30Q24 36 17 30Z" fill="#24313C" /><Ellipse cx="21" cy="25" rx="1.1" ry="1.6" fill="#F4EBDA" /><Ellipse cx="28" cy="25" rx="1.1" ry="1.6" fill="#F4EBDA" />
      <Path d="M15 34L34 30L35 35L17 39Z" fill="#DBCAB0" /><Path d="M16 38L20 49L25 46L22 37" fill="#C5B696" />
      <Rect x="35" y="36" width="4" height="10" rx="1" fill="#E6D9BF" /><Path d="M37 30Q43 36 37 37Q33 35 37 30Z" fill="#FFD59A" />
    </G>}
  </Svg>;
});

export const HouseScene = memo(function HouseScene({ height = 400 }: { height?: number }) {
  const id = useId().replace(/:/g, '');
  return <Svg width="100%" height={height} viewBox="0 0 800 650" preserveAspectRatio="xMidYMid meet">
    <Defs>
      <RadialGradient id={`${id}sky`} cx="65%" cy="30%" r="70%"><Stop stopColor="#304958" /><Stop offset="0.58" stopColor="#172732" /><Stop offset="1" stopColor="#0B1118" /></RadialGradient>
      <RadialGradient id={`${id}moon`}><Stop stopColor="#D0E1D7" stopOpacity="0.25" /><Stop offset="1" stopColor="#BACFC5" stopOpacity="0" /></RadialGradient>
      <LinearGradient id={`${id}wall`} x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#34474B" /><Stop offset="1" stopColor="#1B2A31" /></LinearGradient>
      <LinearGradient id={`${id}window`} x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#F5D18D" /><Stop offset="1" stopColor="#A77449" /></LinearGradient>
      <LinearGradient id={`${id}fog`}><Stop stopColor="#47616A" stopOpacity="0" /><Stop offset="0.5" stopColor="#56747A" stopOpacity="0.16" /><Stop offset="1" stopColor="#47616A" stopOpacity="0" /></LinearGradient>
    </Defs>
    <Rect width="800" height="650" fill={`url(#${id}sky)`} />
    <Circle cx="601" cy="136" r="126" fill={`url(#${id}moon)`} /><Circle cx="601" cy="136" r="43" fill="#D1DCC9" /><Circle cx="618" cy="128" r="39" fill="#263D48" opacity="0.83" />
    {Array.from({ length: 29 }, (_, i) => <Circle key={i} cx={60 + (i * 137) % 710} cy={48 + (i * 67) % 285} r={i % 3 === 0 ? 1.5 : 0.8} fill="#B9CDC8" opacity={0.2 + (i % 4) * 0.12} />)}
    <Path d="M0 363L65 329L93 365L130 311L180 350L243 285L315 344L398 295L479 324L538 275L616 333L697 291L800 356V650H0Z" fill="#14262E" />
    <Path d="M0 427Q220 343 418 410T800 382V650H0Z" fill="#122129" /><Ellipse cx="425" cy="501" rx="272" ry="66" fill="#081218" />
    <Path d="M346 500L458 500L526 650H259Z" fill="#29373B" /><Path d="M361 515L443 515M350 547L455 548M332 587L480 589M307 632L505 634" stroke="#52605A" strokeWidth="3" opacity="0.5" />
    <Path d="M180 298H617V476L400 527L180 471Z" fill={`url(#${id}wall)`} /><Path d="M400 303H617V476L400 527Z" fill="#1D3037" />
    <Path d="M151 309L237 224H581L646 305L400 356Z" fill="#15242D" stroke="#4A5E5E" strokeWidth="3" /><Path d="M170 307L400 350L626 303" fill="none" stroke="#61706A" strokeWidth="4" />
    <Path d="M219 239L269 206L322 242V420L220 401Z" fill="#2C4147" /><Path d="M205 239L269 168L335 241Z" fill="#182A34" stroke="#4C6063" strokeWidth="3" />
    <Path d="M452 264L491 211L536 253V444L452 463Z" fill="#30464B" /><Path d="M439 264L490 169L550 252Z" fill="#162934" stroke="#506168" strokeWidth="3" />
    <Path d="M348 294L400 241L455 294V510L348 493Z" fill="#3A4C4D" /><Path d="M330 296L400 208L474 296L402 319Z" fill="#182A34" stroke="#506369" strokeWidth="3" />
    <Rect x="355" y="193" width="24" height="72" fill="#24373E" /><Path d="M350 191H384V207H350Z" fill="#344B50" />
    <Path d="M245 269Q267 242 288 269V321L245 316Z" fill={`url(#${id}window)`} /><Path d="M267 251V319M246 284L289 289" stroke="#344448" strokeWidth="5" />
    <Path d="M471 292Q490 264 511 285V337L471 345Z" fill={`url(#${id}window)`} /><Path d="M491 276V339M472 309L512 302" stroke="#344448" strokeWidth="5" />
    <Circle cx="401" cy="292" r="19" fill="#D8B170" stroke="#596057" strokeWidth="5" /><Path d="M401 275V309M384 292H419" stroke="#34474B" strokeWidth="4" />
    {[225, 285].map((x) => <G key={x}><Path d={`M${x} 361l33 5v58l-33-8Z`} fill={`url(#${id}window)`} /><Path d={`M${x + 16} 364v57M${x} 390l33 5`} stroke="#334247" strokeWidth="5" /></G>)}
    {[481, 549].map((x) => <G key={x}><Path d={`M${x} 384l31-6v57l-31 7Z`} fill={`url(#${id}window)`} opacity="0.75" /><Path d={`M${x + 15} 381v57M${x} 409l31-6`} stroke="#263C42" strokeWidth="5" /></G>)}
    <Path d="M370 422Q402 383 430 417V501L370 496Z" fill="#101B23" stroke="#6F7761" strokeWidth="4" /><Path d="M382 432Q401 408 419 431V493H382Z" fill="#302B28" /><Line x1="402" y1="420" x2="402" y2="495" stroke="#766346" strokeWidth="2" /><Circle cx="407" cy="464" r="3" fill="#D4B279" />
    <Path d="M353 496L445 500L462 516L341 511Z" fill="#727264" /><Path d="M341 512L462 517L470 526L335 521Z" fill="#4B5753" />
    <Path d="M346 401Q400 375 454 397L446 411Q401 392 354 415Z" fill="#283C43" stroke="#6B7364" strokeWidth="2" />
    <G stroke="#172932" fill="none" strokeLinecap="round"><Path d="M70 551Q111 405 89 210M103 370L46 304L24 240M104 328L148 266L160 217M85 456L27 402M701 552Q673 408 720 217M687 384L765 321L787 263M702 317L666 260L663 203M688 452L758 404" strokeWidth="12" /><Path d="M47 305L79 285M148 267L189 260M762 322L761 275M668 260L623 232" strokeWidth="6" /></G>
    <Path d="M93 493L188 479M109 500V459M149 492V448M184 485V441M624 481L716 498M638 484V446M677 491V455M711 499V463" stroke="#435450" strokeWidth="5" />
    <Ellipse cx="388" cy="529" rx="347" ry="30" fill={`url(#${id}fog)`} /><Ellipse cx="530" cy="583" rx="330" ry="30" fill={`url(#${id}fog)`} />
    {[{ x: 274, y: 488 }, { x: 521, y: 470 }, { x: 167, y: 433 }, { x: 641, y: 389 }].map((p, i) => <G key={i}><Circle cx={p.x} cy={p.y} r="8" fill="#F0C074" opacity="0.08" /><Circle cx={p.x} cy={p.y} r="2" fill="#E4BC7F" opacity="0.8" /></G>)}
  </Svg>;
});

export const RoomArtwork = memo(function RoomArtwork({ chapter }: { chapter: number }) {
  const id = useId().replace(/:/g, '');
  return <Svg width="100%" height="100%" viewBox="0 0 400 440" preserveAspectRatio="none">
    <Defs><LinearGradient id={`${id}floor`} x1="0" y1="0" x2="1" y2="1"><Stop stopColor={chapter === 2 ? '#26363A' : '#374039'} /><Stop offset="1" stopColor="#17232A" /></LinearGradient><RadialGradient id={`${id}light`}><Stop stopColor="#F7C17C" stopOpacity="0.14" /><Stop offset="1" stopColor="#DDA668" stopOpacity="0" /></RadialGradient></Defs>
    <Rect width="400" height="440" fill="#0A1219" />
    <Path d="M36 50L199 17L365 52V373L199 416L36 370Z" fill="#293B43" stroke="#49606B" strokeWidth="1.5" />
    <Path d="M50 92L200 65L349 93V357L199 395L50 355Z" fill={`url(#${id}floor)`} />
    {Array.from({ length: 13 }, (_, i) => <Path key={i} d={`M51 ${106 + i * 20}L349 ${109 + i * 20}`} stroke="#526057" opacity="0.18" strokeWidth="1" />)}
    {[84, 134, 184, 234, 284, 334].map((x) => <Line key={x} x1={x} y1="97" x2={x} y2="355" stroke="#0B151B" opacity="0.18" />)}
    <Path d="M50 92L36 50V370L50 355Z" fill="#25343C" /><Path d="M349 93L365 52V373L349 357Z" fill="#15262F" />
    <Path d="M36 50L199 17L365 52L349 93L200 65L50 92Z" fill="#263C47" />
    <Path d="M172 77V43Q199 19 227 45V79Z" fill="#0A171F" stroke="#778271" strokeWidth="3" /><Path d="M182 73V46Q199 32 217 49V77" fill="#323A32" stroke="#6F7159" strokeWidth="1" /><Line x1="200" y1="40" x2="200" y2="77" stroke="#907C57" /><Circle cx="207" cy="65" r="2" fill="#EDCB8E" />
    <Ellipse cx="202" cy="236" rx="160" ry="172" fill={`url(#${id}light)`} />
    <Path d="M123 188L203 174L281 191L278 322L199 342L121 322Z" fill={chapter === 0 ? '#5A4240' : chapter === 1 ? '#34554F' : '#334048'} stroke="#82725B" strokeWidth="2" opacity="0.57" /><Path d="M136 201L202 189L267 204L264 311L199 327L135 310Z" fill="none" stroke="#9A8964" strokeWidth="1" opacity="0.5" />
    {chapter === 0 ? <G>
      {[109, 154, 199].map((y, i) => <G key={y}><Path d={`M54 ${y}L77 ${y - 5}V${y + 27}L54 ${y + 32}Z`} fill="#7E7054" /><Path d={`M58 ${y + 3}L73 ${y}V${y + 23}L58 ${y + 26}Z`} fill="#26323A" /><Ellipse cx="65" cy={y + 11} rx="4" ry="6" fill="#83908A" opacity={0.4 + i * 0.1} /></G>)}
      <Path d="M290 256L330 260V320L290 325Z" fill="#7C7665" /><Path d="M296 263L324 266V314L296 317Z" fill="#36525C" stroke="#B8B99A" strokeWidth="1" /><Path d="M299 310L317 268" stroke="#C7D0BF" opacity="0.2" />
      <Path d="M278 112L327 116V146L278 142Z" fill="#524E40" /><Rect x="290" y="110" width="22" height="14" rx="5" fill="#19252A" /><Path d="M287 110Q300 96 316 112" fill="none" stroke="#A58B5C" strokeWidth="4" />
      <Path d="M67 287L106 290L111 309L68 306Z" fill="#686450" /><Path d="M73 291L81 301M85 292L93 302M97 294L104 303" stroke="#B7A978" strokeWidth="2" />
    </G> : chapter === 1 ? <G>
      <Path d="M52 111L87 105V218L52 225Z" fill="#574E3D" />
      {[0, 1, 2].map((row) => <G key={row}><Path d={`M54 ${144 + row * 32}L87 ${138 + row * 32}`} stroke="#968569" strokeWidth="4" />{[0, 1, 2, 3].map((col) => <Rect key={col} x={57 + col * 7} y={116 + row * 32} width="5" height={21 + col % 2 * 3} fill={['#7B6156', '#657F75', '#A68A5B', '#485E6A'][col]} />)}</G>)}
      <Path d="M288 109L323 112V150L288 148Z" fill="#776547" /><Circle cx="305" cy="127" r="11" fill="#BCC3A2" /><Path d="M305 120V127L310 131" stroke="#354145" strokeWidth="2" />
      <Path d="M273 268L329 277L329 309L273 300Z" fill="#6B5540" /><Path d="M283 266L300 269L315 267V291L299 294L282 289Z" fill="#D0C4A5" /><Path d="M299 270V292M287 274L295 276M304 275L311 273M287 280L295 282" stroke="#8D7F63" strokeWidth="1" />
      <Circle cx="87" cy="303" r="19" fill="#9A8252" /><Circle cx="87" cy="303" r="14" fill="#213740" /><Path d="M87 291L92 308L87 304L82 308Z" fill="#D9CFAD" />
    </G> : <G>
      <Path d="M52 141L90 136V218L52 226Z" fill="#484942" /><Path d="M53 179L91 172M53 213L91 206" stroke="#776D53" strokeWidth="4" />
      {Array.from({ length: 6 }, (_, i) => <G key={i}><Rect x={59 + i % 3 * 9} y={151 + Math.floor(i / 3) * 32} width="6" height="18" rx="2" fill="#6D8270" /><Rect x={61 + i % 3 * 9} y={145 + Math.floor(i / 3) * 32} width="2" height="7" fill="#9BA281" /></G>)}
      <Path d="M274 105H322V181M285 107V144H342" fill="none" stroke="#526E74" strokeWidth="9" /><Path d="M274 102H322V181M285 104V144H342" fill="none" stroke="#82938D" strokeWidth="2" /><Circle cx="322" cy="152" r="9" fill="#546E72" stroke="#C4B187" strokeWidth="2" />
      <Path d="M286 268L329 277V318L286 310Z" fill="#766247" /><Path d="M290 277L325 284M290 291L325 299M300 272V312" stroke="#433E33" strokeWidth="3" /><Path d="M297 284L318 288V303L297 299Z" fill="#C4B89A" />
      <Circle cx="88" cy="304" r="19" fill="#4E6970" stroke="#AC9B73" strokeWidth="3" /><Path d="M88 285V324M69 304H107M75 291L101 317" stroke="#AC9B73" strokeWidth="3" />
    </G>}
    <Path d="M135 366L199 381L264 369L264 387L199 405L134 388Z" fill="#121F28" />
    <Circle cx="116" cy="119" r="23" fill={`url(#${id}light)`} /><Circle cx="284" cy="100" r="22" fill={`url(#${id}light)`} /><Path d="M115 120V108M285 102V90" stroke="#DEC295" strokeWidth="3" /><Path d="M115 101q6 8 0 8q-4 0 0-8M285 83q6 8 0 8q-4 0 0-8" fill="#F5CC8D" />
  </Svg>;
});
