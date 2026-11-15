type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Opt<T> = { [K in keyof T]+?: T[K] };
type M = Mutable<{ readonly a: number }>;
const m: M = { a: 1 };
m.a = 2;
const o: Opt<{ a: number }> = { a: "x" };
