import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SVGPathData } from 'svg-pathdata';
import { createGameServer } from '../server/server';
import type { Sense } from '../shared/types';

const test = base.extend<{ game: { server: ReturnType<typeof createGameServer>; url: string } }>({
  game: async ({ browserName }, provide) => {
    base.info().annotations.push({ type: 'browser engine', description: browserName });
    const server = createGameServer({ host: '127.0.0.1', port: 0, tickMs: 250 });
    const port = await server.listen();
    try { await provide({ server, url: `http://127.0.0.1:${port}` }); }
    finally { await server.close(); }
  },
});

async function validateSvgPaths(page: Page) {
  const paths = await page.locator('svg path').evaluateAll((elements) => elements.map((element) => element.getAttribute('d')).filter((path): path is string => !!path));
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) expect(() => new SVGPathData(path), `SVG path must also be valid for the native renderer: ${path}`).not.toThrow();
}

async function discover(page: Page, sense: Sense, borrow = false) {
  await page.getByTestId(`spot-${sense}`).click();
  await page.getByRole('button', { name: borrow ? 'Borrow this echo (20s)' : 'Examine the clue', exact: true }).click();
  const text = await page.getByTestId('clue-text').innerText();
  await validateSvgPaths(page);
  await page.getByRole('button', { name: 'Back to the room', exact: true }).click();
  return text;
}
function digit(text: string, reading = false) {
  const match = text.match(/\d+/)?.[0];
  if (!match) throw new Error(`Missing clue number: ${text}`);
  return reading ? match.slice(-1) : match;
}
function decodeOrder(text: string): Sense[] {
  return text.split(': ')[1].replace(/\.$/, '').split(' → ').map((sense) => sense.toLowerCase() as Sense);
}
async function solveDoor(page: Page, code: string) {
  await page.getByTestId('open-lock').click();
  await page.getByTestId('door-code').fill(code);
  await page.getByTestId('solve-code').click();
}

test('English landing, settings, keyboard dialogs, and responsive layouts', async ({ page, game }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 900 ? 1000 : 844 });
    await page.goto(game.url);
    await expect(page.getByTestId('play-solo')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Sound effects', { exact: true })).toBeVisible();
  await page.getByLabel('Sound effects', { exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'How to play', exact: true }).first().click();
  await expect(page.getByText('One escape saves everyone.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'I am ready for the house' })).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('solo player discovers all clues and escapes every room on a phone-sized viewport', async ({ page, game }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(game.url);
  await page.getByTestId('play-solo').click();
  for (const room of ['The Foyer', 'The Library', 'The Cellar']) {
    await expect(page.getByRole('heading', { name: room, exact: true })).toBeVisible();
    await expect(page.getByTestId('open-lock')).toBeInViewport();
    const values = {
      sight: digit(await discover(page, 'sight')),
      hearing: digit(await discover(page, 'hearing')),
      reading: digit(await discover(page, 'reading'), true),
    };
    const order = decodeOrder(await discover(page, 'instinct'));
    if (room === 'The Foyer') await page.screenshot({ path: info.outputPath('game-mobile.png'), fullPage: true });
    await solveDoor(page, order.map((sense) => values[sense as keyof typeof values]).join(''));
  }
  await expect(page.getByText('THE WAY IS OPEN', { exact: true })).toBeVisible();
  await expect(page.getByText('Everyone wins', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('victory-mobile.png'), fullPage: true });
  await page.getByTestId('play-again').click();
  await expect(page.getByRole('heading', { name: 'The Foyer', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('four browsers cooperate and the final survivor wins for the entire team', async ({ browser, game }, info) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' })));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const errors: string[] = [];
  pages.forEach((page) => page.on('pageerror', (error) => errors.push(error.message)));
  try {
    await pages[0].goto(game.url);
    await pages[0].getByTestId('create-room').click();
    await pages[0].getByLabel('Your explorer name', { exact: true }).fill('Alex');
    await pages[0].getByRole('radio', { name: 'Unhurried, 5-minute flame' }).click();
    await pages[0].getByTestId('submit-room').click();
    const code = await pages[0].getByTestId('room-code').innerText();
    for (let i = 1; i < pages.length; i++) {
      await pages[i].goto(`${game.url}/?room=${code}`);
      await pages[i].getByLabel('Your explorer name', { exact: true }).fill(['Alex', 'Blair', 'Cleo', 'Drew'][i]);
      await pages[i].getByTestId('submit-room').click();
      await expect(pages[i].getByTestId('room-code')).toHaveText(code);
    }
    await pages[0].screenshot({ path: info.outputPath('lobby-four-players.png'), fullPage: true });
    for (const page of pages) await page.getByTestId('ready-button').click();
    await pages[0].getByTestId('start-game').click();
    for (const page of pages) await expect(page.getByRole('heading', { name: 'The Foyer', exact: true })).toBeVisible();
    const state = game.server.rooms.get(code)!;
    state.game.players.slice(1).forEach((player) => { player.expiresAt = Date.now() - 10; });
    game.server.tick();
    await expect(pages[1].getByText('You are in the mist, but still on the team. Share clues you remember. If anyone escapes, you win too.', { exact: true })).toBeVisible();
    await pages[0].screenshot({ path: info.outputPath('last-survivor.png'), fullPage: true });
    for (const room of ['The Foyer', 'The Library', 'The Cellar']) {
      await expect(pages[0].getByRole('heading', { name: room, exact: true })).toBeVisible();
      const values = {
        sight: digit(await discover(pages[0], 'sight')),
        hearing: digit(await discover(pages[0], 'hearing', true)),
        reading: digit(await discover(pages[0], 'reading', true), true),
      };
      const order = decodeOrder(await discover(pages[0], 'instinct', true));
      await solveDoor(pages[0], order.map((sense) => values[sense as keyof typeof values]).join(''));
    }
    for (const page of pages) await expect(page.getByText('Everyone wins', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map((context) => context.close())); }
});

test('manual reconnect does not race the retry timer and reload restores private clues', async ({ page, browser, game }) => {
  await page.clock.install();
  let resumes = 0;
  page.on('websocket', (socket) => socket.on('framesent', (frame) => {
    if (typeof frame.payload === 'string' && JSON.parse(frame.payload).type === 'resume') resumes++;
  }));
  const peerContext = await browser.newContext({ reducedMotion: 'reduce' });
  const peer = await peerContext.newPage();
  try {
    await page.goto(game.url);
    await page.getByTestId('create-room').click();
    await page.getByLabel('Your explorer name', { exact: true }).fill('Alice');
    await page.getByTestId('submit-room').click();
    const code = await page.getByTestId('room-code').innerText();
    await peer.goto(`${game.url}/?room=${code}`);
    await peer.getByLabel('Your explorer name', { exact: true }).fill('Blair');
    await peer.getByTestId('submit-room').click();
    await page.getByTestId('ready-button').click();
    await peer.getByTestId('ready-button').click();
    await page.getByTestId('start-game').click();
    await discover(page, 'sight');
    const room = game.server.rooms.get(code)!;
    const id = room.game.players[0].id;
    const originalSocket = room.seats.get(id)!.socket!;
    originalSocket.close(1012, 'Reconnect test');
    await page.getByRole('button', { name: 'Reconnect now', exact: true }).click();
    await expect.poll(() => room.seats.get(id)?.socket !== originalSocket && room.seats.get(id)?.socket?.readyState === 1).toBe(true);
    await page.clock.fastForward(1200);
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
    expect(resumes).toBe(1);
    await expect(page.getByRole('button', { name: 'Notebook (1)', exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: `Rejoin ${code}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'The Foyer', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notebook (1)', exact: true })).toBeVisible();
    expect(room.game.players.length).toBe(2);
    expect(resumes).toBe(2);
  } finally { await peerContext.close(); }
});

test('a spent practice flame leads to a complete loss screen', async ({ page, game }) => {
  await page.clock.install();
  await page.goto(game.url);
  await page.getByTestId('play-solo').click();
  await expect(page.getByRole('heading', { name: 'The Foyer', exact: true })).toBeVisible();
  await page.clock.fastForward(400_000);
  await expect(page.getByText('UNTIL THE NEXT LIGHT', { exact: true })).toBeVisible();
  await expect(page.getByTestId('play-again')).toBeEnabled();
});
