function map<T, U>(xs: T[], f: (x: T) => U): U[] {
  return [];
}
const r: string[] = map([1, 2], (x) => x * 2);
const s: number[] = map(["a"], (x) => x.length);
