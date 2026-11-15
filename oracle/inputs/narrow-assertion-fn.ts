function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== "string") throw 0;
}
function f(v: unknown) {
  assertIsString(v);
  const n: number = v;
}
