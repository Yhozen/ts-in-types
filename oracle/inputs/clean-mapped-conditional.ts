type Flags<T> = { [K in keyof T]: boolean };
type Opts = Flags<{ a: string; b: number }>;
const o: Opts = { a: true, b: false };
type Unwrap<T> = T extends Array<infer U> ? U : T;
const u: Unwrap<number[]> = 1;
