interface Weak { a?: number; b?: string }
const w: Weak = { c: 1 };
declare const x: { c: number };
const w2: Weak = x;
