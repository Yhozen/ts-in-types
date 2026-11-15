type A = { a: number; common: string };
type B = { b: number; common: string };
declare const u: A | B;
u.common;
u.a;
