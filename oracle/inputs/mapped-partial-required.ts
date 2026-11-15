type P = Partial<{ a: number; b: string }>;
const p: P = {};
type R = Required<P>;
const r: R = { a: 1 };
