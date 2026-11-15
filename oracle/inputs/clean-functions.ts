function add(a: number, b: number): number {
  return a + b;
}
const mul = (a: number, b: number) => a * b;
const r: number = add(mul(2, 3), 4);
