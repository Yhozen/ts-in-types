interface A { a: number }
const fresh: A = { a: 1, b: 2 };
const stale = { a: 1, b: 2 };
const ok: A = stale;
