interface O {
  a?: number;
  b: string;
}
const o1: O = { b: "x" };
const o2: O = { a: undefined, b: "x" };
const o3: O = { a: "1", b: "x" };
const n: number = o1.a;
