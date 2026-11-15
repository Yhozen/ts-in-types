interface Box<T = string> {
  v: T;
}
const a: Box = { v: 1 };
const b: Box<number> = { v: 1 };
