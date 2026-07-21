import { randomBytes } from 'node:crypto';

// In-memory game store. Swappable for redis/postgres later without touching the API.
const games = new Map();

export function createGame(state) {
  const id = randomBytes(4).toString('hex');
  games.set(id, state);
  return id;
}

export function getGame(id) {
  return games.get(id) || null;
}

export function setGame(id, state) {
  games.set(id, state);
}
