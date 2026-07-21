import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.js';

function listen(app) {
  return new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
}

test('health endpoint responds ok', async () => {
  const srv = await listen(createApp());
  const base = `http://localhost:${srv.address().port}`;
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  srv.close();
});
