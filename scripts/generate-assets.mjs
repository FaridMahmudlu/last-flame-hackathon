import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../assets/', import.meta.url));
await mkdir(directory, { recursive: true });
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><radialGradient id="g"><stop stop-color="#61482e"/><stop offset="1" stop-color="#0b1118"/></radialGradient><linearGradient id="f" x2="0" y2="1"><stop stop-color="#ffe5ae"/><stop offset="1" stop-color="#d78c4e"/></linearGradient></defs><rect width="1024" height="1024" rx="226" fill="#0b1118"/><circle cx="512" cy="468" r="375" fill="url(#g)"/><path d="M512 146C543 284 693 330 693 474C693 580 615 642 512 642C409 642 335 574 335 476C335 391 404 326 425 260C440 318 452 355 476 373C524 320 534 247 512 146Z" fill="url(#f)"/><path d="M516 369C510 439 571 447 571 511C571 550 547 573 513 573C480 573 456 548 456 513C456 455 494 439 516 369Z" fill="#fff2cd"/><rect x="467" y="664" width="90" height="159" rx="18" fill="#e4d5b8"/><path d="M470 681q28 41 44 0q22 31 41 0" fill="none" stroke="#fff0d1" stroke-width="10"/><path d="M415 839h194" stroke="#a47e52" stroke-width="15" stroke-linecap="round"/></svg>`;
await Promise.all([
  sharp(Buffer.from(mark)).png().toFile(`${directory}/icon.png`),
  sharp(Buffer.from(mark)).resize(1024).png().toFile(`${directory}/adaptive-icon.png`),
  sharp(Buffer.from(mark)).resize(64).png().toFile(`${directory}/favicon.png`),
]);
function wave(duration, sample) {
  const rate = 22050;
  const length = Math.floor(rate * duration);
  const buffer = Buffer.alloc(44 + length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + length * 2, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample(i / rate))) * 32767), 44 + i * 2);
  return buffer;
}
await writeFile(`${directory}/knock.wav`, wave(0.22, (t) => (Math.sin(2 * Math.PI * 135 * t) + 0.3 * Math.sin(2 * Math.PI * 340 * t)) * Math.exp(-25 * t) * Math.min(1, t * 1000) * 0.23));
await writeFile(`${directory}/unlock.wav`, wave(1.4, (t) => [261.63, 329.63, 392].reduce((sum, hz, index) => sum + (t > index * 0.14 ? Math.sin(2 * Math.PI * hz * (t - index * 0.14)) * Math.exp(-3 * (t - index * 0.14)) : 0), 0) * Math.min(1, t * 40) * 0.07));
console.log('Generated original Last Flame icons and sound effects.');
