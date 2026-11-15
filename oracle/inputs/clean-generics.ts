function first<T>(xs: T[]): T | undefined {
  return xs[0];
}
const n: number | undefined = first([1, 2, 3]);
class Box<T> {
  constructor(readonly value: T) {}
  map<U>(f: (x: T) => U): Box<U> {
    return new Box(f(this.value));
  }
}
const b: Box<string> = new Box(1).map((x) => String(x));
