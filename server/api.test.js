import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.js';

function listen(app) {
  return new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
}

async function withServer(fn) {
  const srv = await listen(createApp());
  const base = `http://localhost:${srv.address().port}`;
  const api = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };
  try {
    await fn(api);
  } finally {
    srv.close();
  }
}

test('health endpoint responds ok', async () => {
  await withServer(async (api) => {
    const res = await api('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });
});

test('create game, fetch state, list legal moves', async () => {
  await withServer(async (api) => {
    const created = await api('POST', '/api/games', {});
    assert.equal(created.status, 201);
    assert.equal(created.body.turn, 'w');
    assert.equal(created.body.status.over, false);

    const fetched = await api('GET', `/api/games/${created.body.id}`);
    assert.equal(fetched.status, 200);
    assert.deepEqual(fetched.body.board[0][4], { type: 'k', color: 'w' });

    const moves = await api('GET', `/api/games/${created.body.id}/moves?from=e2`);
    assert.equal(moves.status, 200);
    assert.deepEqual(moves.body.moves.map((m) => m.to).sort(), ['e3', 'e4']);
  });
});

test('illegal move returns 400 with reason; unknown game 404', async () => {
  await withServer(async (api) => {
    const { body: game } = await api('POST', '/api/games', {});
    const bad = await api('POST', `/api/games/${game.id}/move`, { from: 'e2', to: 'e5' });
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /illegal/);
    const missing = await api('GET', '/api/games/nope');
    assert.equal(missing.status, 404);
  });
});

test("full API game: scholar's mate ends in checkmate", async () => {
  await withServer(async (api) => {
    const { body: game } = await api('POST', '/api/games', {});
    const line = [
      ['e2', 'e4'], ['e7', 'e5'],
      ['f1', 'c4'], ['b8', 'c6'],
      ['d1', 'h5'], ['g8', 'f6'],
      ['h5', 'f7'],
    ];
    let last;
    for (const [from, to] of line) {
      last = await api('POST', `/api/games/${game.id}/move`, { from, to });
      assert.equal(last.status, 200, JSON.stringify(last.body));
    }
    assert.deepEqual(
      { over: last.body.status.over, winner: last.body.status.winner, reason: last.body.status.reason },
      { over: true, winner: 'w', reason: 'checkmate' }
    );
    // Game is over: further moves rejected.
    const after = await api('POST', `/api/games/${game.id}/move`, { from: 'e8', to: 'f7' });
    assert.equal(after.status, 400);
  });
});
