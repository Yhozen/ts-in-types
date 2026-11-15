const [a, b = 2, ...rest] = [1, undefined, 3, 4];
const { x, y: { z } = { z: 0 }, ...others } = { x: 1, y: { z: 2 }, w: 3 };
const s: number = a + b + rest.length + x + z + others.w;
function f({ p, q = "d" }: { p: number; q?: string }) {
  return p + q.length;
}
