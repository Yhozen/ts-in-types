type A = { a: number };
type B = { b: string };
const ab: A & B = { a: 1 };
const n: never = null as unknown as string & number;
type X = { k: string } & { k: number };
declare const x: X;
const s: string = x.k;
