function tuple<const T extends readonly unknown[]>(x: T): T {
  return x;
}
const t = tuple([1, "a"]);
const u: [number, string] = t;
