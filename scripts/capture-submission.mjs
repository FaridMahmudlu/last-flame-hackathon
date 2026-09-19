import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const output = resolve('public');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', recordVideo: { dir: resolve('.expo', 'submission-video'), size: { width: 1280, height: 900 } } });
const page = await context.newPage();
const video = page.video();
page.setDefaultTimeout(12000);
const started = Date.now();
try {
  await page.goto(process.env.DEMO_URL ?? 'http://127.0.0.1:8787');
  await page.getByTestId('play-solo').waitFor();
  await page.waitForTimeout(700);
  await page.getByTestId('play-solo').click();
  for (let chapter = 0; chapter < 3; chapter++) {
    const values = {};
    let order = [];
    for (const sense of ['sight', 'hearing', 'reading', 'instinct']) {
      await page.getByTestId(`spot-${sense}`).click();
      await page.getByRole('button', { name: 'Examine the clue', exact: true }).click();
      const text = await page.getByTestId('clue-text').innerText();
      if (sense === 'instinct') order = text.split(': ')[1].replace(/\.$/, '').split(' → ').map((value) => value.toLowerCase());
      else {
        const number = text.match(/\d+/)?.[0];
        if (!number) throw new Error('A clue did not contain its expected value.');
        values[sense] = sense === 'reading' ? number.slice(-1) : number;
      }
      await page.waitForTimeout(250);
      await page.getByRole('button', { name: 'Back to the room', exact: true }).click();
    }
    if (chapter === 0) await page.screenshot({ path: resolve(output, 'last-flame.png'), fullPage: true });
    await page.getByTestId('open-lock').click();
    await page.getByTestId('door-code').fill(order.map((sense) => values[sense]).join(''));
    await page.getByTestId('solve-code').click();
  }
  await page.getByText('THE WAY IS OPEN', { exact: true }).waitFor();
  await page.waitForTimeout(1000);
} finally {
  await context.close();
  await video.saveAs(resolve(output, 'last-flame-demo.webm'));
  await browser.close();
}
console.log(`Submission screenshot and demo saved. Recording wall time: ${((Date.now() - started) / 1000).toFixed(1)} seconds.`);
