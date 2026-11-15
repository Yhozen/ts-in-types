function get<T, K extends keyof T>(o: T, k: K): T[K] {
  return o[k];
}
const o = { a: 1, b: "x" };
const a: number = get(o, "a");
const b: number = get(o, "b");
get(o, "c");
