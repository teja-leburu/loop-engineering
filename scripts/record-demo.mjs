// Records a demo of Chess Forge: plain-chess checkmate, then a forged game
// with royal-knights + wormholes + atomic-captures (teleports & explosion).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const FRAMES = new URL('./frames/', import.meta.url).pathname;
fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });

let n = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860 });

async function shot(hold = 1) {
  for (let i = 0; i < hold; i++) {
    await page.screenshot({ path: `${FRAMES}f${String(n++).padStart(3, '0')}.png` });
  }
}

async function clickSquare(square) {
  await page.click(`[data-square="${square}"]`);
  await sleep(350);
}

async function move(from, to, holdAfter = 2) {
  await clickSquare(from);
  await shot(1); // show highlighted legal moves
  await clickSquare(to);
  await shot(holdAfter);
}

// --- Act 1: plain chess, fool's mate ---------------------------------------
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
await sleep(500);
await shot(3);
await move('f2', 'f3');
await move('e7', 'e5');
await move('g2', 'g4');
await move('d8', 'h4', 5); // CHECKMATE banner

// --- Act 2: forge a variant --------------------------------------------------
// Toggle royal-knights (0), wormholes (2), atomic-captures (3)
for (const idx of [0, 2, 3]) {
  await page.evaluate((i) => document.querySelectorAll('.forge-toggle')[i].click(), idx);
  await sleep(200);
  await shot(1);
}
await shot(2);
await page.click('#new-game');
await sleep(600);
await shot(4); // fresh board with glowing wormholes + rule badges

// --- Act 3: teleports and the big blast -------------------------------------
await move('e2', 'e4', 4); // pawn rides the e4→d5 wormhole
await move('g8', 'f6');
await move('d5', 'd6');
await move('f6', 'e4', 4); // black knight rides the same wormhole
await move('d6', 'c7', 6); // atomic capture: b8 knight, c8 bishop, d8 queen vaporized
await shot(4);

await browser.close();
console.log(`captured ${n} frames`);
