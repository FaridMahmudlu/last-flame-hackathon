import { chromium } from '@playwright/test';
import process from 'node:process';

const code = process.env.ROOM_CODE?.toUpperCase();
if (!code || !/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new Error('Set ROOM_CODE to an explicitly authorized test room.');
const server = process.env.GAME_SERVER_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const clients = [];
let stopped = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopped = true; });
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

try {
  for (const name of ['QA Listener', 'QA Archivist', 'QA Seeker']) {
    const context = await browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const client = { context, page, name, view: null, error: null, handled: -1 };
    clients.push(client);
    page.on('websocket', (socket) => socket.on('framereceived', (frame) => {
      if (typeof frame.payload !== 'string') return;
      const message = JSON.parse(frame.payload);
      if (message.type === 'state' || message.type === 'welcome') client.view = message.view;
      if (message.type === 'error') client.error = message.error;
    }));
    await page.goto(`${server}/?room=${code}`);
    await page.getByLabel('Your explorer name', { exact: true }).fill(name);
    await page.getByTestId('submit-room').click();
    try { await page.getByTestId('room-code').waitFor({ timeout: 6000 }); }
    catch { throw new Error(client.error || 'The test client could not join. Confirm the current room code and server.'); }
    console.log(`${name} joined the authorized room.`);
  }
  for (const client of clients) await client.page.getByTestId('ready-button').click();
  console.log('Three explicitly labeled QA clients are ready. The host controls when the escape starts.');
  const deadline = Date.now() + 10 * 60_000;
  while (!stopped && Date.now() < deadline) {
    if (clients.some((client) => ['won', 'lost'].includes(client.view?.phase))) {
      console.log(`The mixed-device round ended: ${clients[0].view?.phase}.`);
      break;
    }
    for (const client of clients) {
      const view = client.view;
      if (!view || view.phase !== 'playing' || client.handled === view.chapter) continue;
      const player = view.players.find((item) => item.id === view.youId);
      if (!player || player.status !== 'alive') continue;
      for (const sense of player.senses) {
        await client.page.getByTestId(`spot-${sense}`).click();
        await client.page.getByRole('button', { name: 'Examine the clue', exact: true }).click();
        await client.page.getByTestId('clue-text').waitFor();
        await client.page.getByRole('button', { name: 'Share clue with team', exact: true }).click();
        await client.page.getByRole('button', { name: 'Back to the room', exact: true }).click();
        console.log(`${client.name} shared its ${sense} clue for chapter ${view.chapter + 1}.`);
      }
      client.handled = view.chapter;
    }
    await delay(400);
  }
} finally {
  for (const client of clients) {
    try {
      const close = client.page.getByRole('button', { name: 'Close dialog', exact: true });
      if (await close.isVisible()) await close.click();
      const back = client.page.getByRole('button', { name: 'Back to the fireside', exact: true });
      if (await back.isVisible()) await back.click();
      const leave = client.page.getByRole('button', { name: 'Leave this escape', exact: true });
      if (await leave.isVisible()) await leave.click();
    } catch { continue; }
  }
  await browser.close();
}
