import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newGame, applyMove, legalMovesAt, status, coords, sq } from './engine.js';
import { CATALOG } from './rules.js'; // also registers all rule modifiers
import { createGame, getGame, setGame } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function view(id, state) {
  return {
    id,
    board: state.board,
    turn: state.turn,
    status: status(state),
    history: state.history,
    captured: state.captured,
    rules: state.rules,
  };
}

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/rules', (req, res) => res.json({ rules: CATALOG }));

  app.post('/api/games', (req, res) => {
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    const unknown = rules.filter((id) => !CATALOG.some((r) => r.id === id));
    if (unknown.length) {
      return res.status(400).json({ error: `unknown rule ids: ${unknown.join(', ')}` });
    }
    const state = newGame(rules);
    const id = createGame(state);
    res.status(201).json(view(id, state));
  });

  app.get('/api/games/:id', (req, res) => {
    const state = getGame(req.params.id);
    if (!state) return res.status(404).json({ error: 'game not found' });
    res.json(view(req.params.id, state));
  });

  app.get('/api/games/:id/moves', (req, res) => {
    const state = getGame(req.params.id);
    if (!state) return res.status(404).json({ error: 'game not found' });
    const from = req.query.from;
    if (!from || !/^[a-h][1-8]$/.test(from)) {
      return res.status(400).json({ error: 'from must be a square like e2' });
    }
    const { r, c } = coords(from);
    const moves = legalMovesAt(state, r, c).map((m) => ({
      to: sq(m.to.r, m.to.c),
      promotion: !!m.promotion,
      capture: !!m.capture,
    }));
    res.json({ from, moves });
  });

  app.post('/api/games/:id/move', (req, res) => {
    const state = getGame(req.params.id);
    if (!state) return res.status(404).json({ error: 'game not found' });
    const { from, to, promotion } = req.body || {};
    if (!/^[a-h][1-8]$/.test(from || '') || !/^[a-h][1-8]$/.test(to || '')) {
      return res.status(400).json({ error: 'from/to must be squares like e2' });
    }
    if (status(state).over) return res.status(400).json({ error: 'game is over' });
    try {
      const next = applyMove(state, from, to, promotion);
      setGame(req.params.id, next);
      res.json(view(req.params.id, next));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`⚡ Chess Forge running at http://localhost:${port}`);
  });
}
