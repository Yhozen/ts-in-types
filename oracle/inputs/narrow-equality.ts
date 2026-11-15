function f(x: "a" | "b" | 1, y: "a" | 2) {
  if (x === y) {
    const s: "a" = x;
  }
  if (x == null) {
    const n: never = x;
  }
}
