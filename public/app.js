const GLYPHS = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};
const FILES = 'abcdefgh';

const PORTAL_SQUARES = ['d4', 'e5', 'e4', 'd5'];

let game = null; // last server view
let selected = null; // 'e2'
let moveTargets = []; // [{to, promotion, capture}]
let catalog = []; // rule modifiers from /api/rules
let forgeSelection = new Set(); // rule ids toggled for the next game
let explodeSquares = []; // squares to flash on next render

const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn-indicator');
const bannerEl = document.getElementById('banner');
const historyEl = document.getElementById('history');
const linkEl = document.getElementById('game-link');

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'request failed');
  return data;
}

function sqName(r, c) {
  return FILES[c] + (r + 1);
}

function render() {
  boardEl.innerHTML = '';
  const lastMove = game.history.at(-1);
  const kingInCheck = game.status.check ? findKing(game.turn) : null;
  // Draw ranks 8→1 top to bottom.
  for (let r = 7; r >= 0; r--) {
    for (let c = 0; c < 8; c++) {
      const name = sqName(r, c);
      const cell = document.createElement('div');
      cell.className = `square ${(r + c) % 2 ? 'light' : 'dark'}`;
      cell.dataset.square = name;
      if (selected === name) cell.classList.add('selected');
      const target = moveTargets.find((m) => m.to === name);
      if (target) cell.classList.add(target.capture ? 'capturable' : 'movable');
      if (lastMove && (lastMove.slice(0, 2) === name || lastMove.slice(2, 4) === name)) {
        cell.classList.add('last-move');
      }
      if (kingInCheck === name) cell.classList.add('in-check');
      if (game.rules.includes('wormholes') && PORTAL_SQUARES.includes(name)) {
        cell.classList.add('wormhole');
      }
      if (explodeSquares.includes(name)) cell.classList.add('explode');

      const piece = game.board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = `piece ${piece.color}`;
        span.textContent = GLYPHS[piece.color][piece.type];
        cell.appendChild(span);
      }
      if (c === 7 || r === 0) {
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = c === 7 && r === 0 ? name : c === 7 ? String(r + 1) : FILES[c];
        cell.appendChild(label);
      }
      cell.addEventListener('click', () => onSquareClick(name, r, c));
      boardEl.appendChild(cell);
    }
  }
  renderPanels();
  explodeSquares = [];
}

function boardDiffVanished(prev, next, ignore) {
  // squares that HAD a piece and now don't (explosions / teleport departures)
  const out = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const name = sqName(r, c);
      if (prev[r][c] && !next[r][c] && !ignore.includes(name)) out.push(name);
    }
  }
  return out;
}

function findKing(color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c];
      if (p && p.type === 'k' && p.color === color) return sqName(r, c);
    }
  }
  return null;
}

function renderPanels() {
  const { status, turn } = game;
  turnEl.innerHTML = `<span class="dot ${turn}"></span>${turn === 'w' ? 'White' : 'Black'} to move`;
  bannerEl.className = '';
  if (status.over) {
    bannerEl.classList.add('over');
    if (status.reason === 'checkmate') {
      bannerEl.textContent = `☠ CHECKMATE — ${status.winner === 'w' ? 'White' : 'Black'} wins`;
    } else if (status.reason === 'king-exploded') {
      bannerEl.textContent = `💥 KING VAPORIZED — ${status.winner === 'w' ? 'White' : 'Black'} wins`;
    } else if (status.reason === 'stalemate') {
      bannerEl.textContent = '⚖ STALEMATE — draw';
    } else {
      bannerEl.textContent = '⚖ DRAW — insufficient material';
    }
  } else if (status.check) {
    bannerEl.classList.add('check');
    bannerEl.textContent = '⚠ CHECK';
  } else {
    bannerEl.textContent = '';
  }

  historyEl.innerHTML = '';
  game.history.forEach((mv, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="num">${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'}</span>${mv}`;
    historyEl.appendChild(li);
  });
  historyEl.scrollTop = historyEl.scrollHeight;

  for (const color of ['w', 'b']) {
    const el = document.getElementById(`captured-${color}`);
    const victimColor = color === 'w' ? 'b' : 'w';
    el.textContent = game.captured[color].map((t) => GLYPHS[victimColor][t]).join(' ');
  }
  linkEl.textContent = `game id: ${game.id} — open this URL in a second window to share the board`;

  const badges = document.getElementById('rule-badges');
  badges.innerHTML = '';
  for (const id of game.rules) {
    const meta = catalog.find((r) => r.id === id);
    const b = document.createElement('span');
    b.className = 'rule-badge';
    b.title = meta ? `${meta.name} — ${meta.description}` : id;
    b.textContent = meta ? `${meta.emoji} ${meta.name}` : id;
    badges.appendChild(b);
  }
}

function renderForge() {
  const wrap = document.getElementById('forge-toggles');
  wrap.innerHTML = '';
  for (const rule of catalog) {
    const card = document.createElement('div');
    card.className = 'forge-toggle' + (forgeSelection.has(rule.id) ? ' active' : '');
    card.innerHTML = `<span class="emoji">${rule.emoji}</span><span>${rule.name}</span><span class="desc">${rule.description}</span>`;
    card.addEventListener('click', () => {
      forgeSelection.has(rule.id) ? forgeSelection.delete(rule.id) : forgeSelection.add(rule.id);
      renderForge();
    });
    wrap.appendChild(card);
  }
}

async function onSquareClick(name, r, c) {
  if (game.status.over) return;
  const target = moveTargets.find((m) => m.to === name);
  if (selected && target) {
    let promotion;
    if (target.promotion) promotion = await pickPromotion();
    try {
      const prevBoard = game.board;
      const from = selected;
      game = await api('POST', `/api/games/${game.id}/move`, { from, to: name, promotion });
      explodeSquares = boardDiffVanished(prevBoard, game.board, [from]);
      if (!game.rules.includes('atomic-captures')) explodeSquares = [];
    } catch (err) {
      flashBanner(err.message);
    }
    selected = null;
    moveTargets = [];
    render();
    return;
  }
  const piece = game.board[r][c];
  if (piece && piece.color === game.turn) {
    selected = name;
    const data = await api('GET', `/api/games/${game.id}/moves?from=${name}`);
    moveTargets = data.moves;
  } else {
    selected = null;
    moveTargets = [];
  }
  render();
}

function flashBanner(msg) {
  bannerEl.className = 'check';
  bannerEl.textContent = `✖ ${msg}`;
}

function pickPromotion() {
  const dialog = document.getElementById('promotion-dialog');
  const choices = document.getElementById('promotion-choices');
  choices.innerHTML = '';
  const color = game.turn;
  return new Promise((resolve) => {
    for (const t of ['q', 'r', 'b', 'n']) {
      const btn = document.createElement('button');
      btn.textContent = GLYPHS[color][t];
      btn.addEventListener('click', () => {
        dialog.close();
        resolve(t);
      });
      choices.appendChild(btn);
    }
    dialog.showModal();
  });
}

async function newGame() {
  game = await api('POST', '/api/games', { rules: [...forgeSelection] });
  location.hash = game.id;
  selected = null;
  moveTargets = [];
  render();
}

async function loadOrCreate() {
  catalog = (await api('GET', '/api/rules')).rules;
  renderForge();
  const id = location.hash.slice(1);
  if (id) {
    try {
      game = await api('GET', `/api/games/${id}`);
      render();
      return;
    } catch { /* stale id — fall through to a fresh game */ }
  }
  await newGame();
}

document.getElementById('new-game').addEventListener('click', newGame);
// Poll so a second window viewing the same game stays in sync.
setInterval(async () => {
  if (!game || game.status.over) return;
  try {
    const fresh = await api('GET', `/api/games/${game.id}`);
    if (fresh.history.length !== game.history.length) {
      game = fresh;
      selected = null;
      moveTargets = [];
      render();
    }
  } catch { /* server restart — ignore */ }
}, 1500);

loadOrCreate();
