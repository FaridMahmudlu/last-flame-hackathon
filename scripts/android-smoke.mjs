import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const exec = promisify(execFile);
const directory = resolve('.expo', 'android-smoke');
await mkdir(directory, { recursive: true });
if (process.argv.includes('--clear-capture')) {
  await Promise.all(['current-screen.png', 'current-screen.xml'].map((name) => rm(resolve(directory, name), { force: true })));
  console.log('Cleared the temporary native screen capture.');
  process.exit(0);
}
const serial = process.env.ANDROID_SERIAL;
if (!serial) throw new Error('Set ANDROID_SERIAL to the authorized test device.');
const shell = async (...args) => (await exec('adb', ['-s', serial, ...args], { timeout: 25000, maxBuffer: 8 * 1024 * 1024 })).stdout;
if ((await shell('shell', 'am', 'get-current-user')).trim() !== '0') throw new Error('Native smoke testing is limited to the main Android profile.');
if (process.argv.includes('--launch')) {
  await shell('shell', 'am', 'start', '-W', '--user', '0', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:8081?lastFlameBuild=${Date.now()}`, '-p', 'host.exp.exponent');
  await new Promise((done) => setTimeout(done, 2500));
}
const remoteFile = `/sdcard/last-flame-test-${Date.now()}.xml`;
let hierarchyCreated = false;
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const ensureForeground = async () => {
  const windows = await shell('shell', 'dumpsys', 'window');
  const focus = windows.split('\n').find((line) => line.includes('mCurrentFocus='));
  if (!focus?.includes('host.exp.exponent')) throw new Error('Expo Go is not in the foreground. No screen was captured or input sent.');
};
const capture = async (name) => {
  await ensureForeground();
  const { stdout } = await exec('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024, timeout: 20000 });
  await writeFile(resolve(directory, `${name}.png`), stdout);
};
const hierarchy = async () => {
  await ensureForeground();
  await shell('shell', 'uiautomator', 'dump', '--compressed', remoteFile);
  hierarchyCreated = true;
  return shell('shell', 'cat', remoteFile);
};
const tapNode = async (xml, label) => {
  await ensureForeground();
  const nodes = xml.match(/<node\b[^>]*>/g) ?? [];
  const node = nodes.find((item) => item.includes(`content-desc="${label}"`) || item.includes(`text="${label}"`));
  const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) return false;
  const [, left, top, right, bottom] = bounds.map(Number);
  if (right <= left || bottom <= top) return false;
  await shell('shell', 'input', 'tap', String(Math.round((left + right) / 2)), String(Math.round((top + bottom) / 2)));
  return true;
};

try {
  await ensureForeground();
  let xml = await hierarchy();
  if (!xml.includes('LAST FLAME') && !xml.includes('The light flickered.')) {
    const labels = [...xml.matchAll(/(?:text|content-desc)="([^"]*)"/g)].map((match) => match[1]).filter((text) => /expo|error|reload|unable|bundle|development|project|SDK|continue|network|last.flame/i.test(text) && !/token|password|secret|@/i.test(text)).slice(0, 8).map((text) => text.slice(0, 160));
    throw new Error(`Last Flame is not visible in Expo Go. No input or screen capture was taken. Status: ${labels.join(' | ') || 'No project status labels available.'}`);
  }
  await capture('current-screen');
  await writeFile(resolve(directory, 'current-screen.xml'), xml);
  if (process.argv.includes('--capture-only')) {
    console.log(`Captured the authorized Expo Go test screen in ${directory}`);
  } else {
    if (!xml.includes('host.exp.exponent')) throw new Error('Expo Go is not the visible app. No input was sent.');
    if (!xml.includes('Keep the light.') && !xml.includes('Try solo practice')) throw new Error('The home screen is required for solo smoke testing. The active room was left unchanged.');
    let tapped = await tapNode(xml, 'Try solo practice');
    if (!tapped) {
      const dimensions = (await shell('shell', 'wm', 'size')).match(/(?:Physical|Override) size: (\d+)x(\d+)/);
      if (!dimensions) throw new Error('Cannot determine the test display dimensions.');
      const width = Number(dimensions[1]);
      const height = Number(dimensions[2]);
      await ensureForeground();
      await shell('shell', 'input', 'swipe', String(width / 2), String(Math.floor(height * 0.78)), String(width / 2), String(Math.floor(height * 0.35)), '450');
      await delay(500);
      xml = await hierarchy();
      tapped = await tapNode(xml, 'Try solo practice');
    }
    if (!tapped) throw new Error('The solo practice button is not visible. Inspect current-screen.png.');
    await delay(1600);
    xml = await hierarchy();
    await writeFile(resolve(directory, 'game-screen.xml'), xml);
    await capture('game-screen');
    if (!xml.includes('The Foyer')) throw new Error('The native game did not reach The Foyer.');
    if (!await tapNode(xml, 'Explore Sight clue')) throw new Error('The native Sight hotspot is not visible.');
    await delay(1600);
    xml = await hierarchy();
    if (!await tapNode(xml, 'Examine the clue')) throw new Error('The examine action is not visible.');
    await delay(700);
    xml = await hierarchy();
    await capture('clue-screen');
    if (!xml.includes('golden seal')) throw new Error('The native clue was not revealed.');
    console.log('Android smoke passed: native home, solo practice, movement, and private clue discovery.');
  }
} finally {
  if (hierarchyCreated) await shell('shell', 'rm', remoteFile).catch(() => undefined);
}
