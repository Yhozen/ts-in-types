interface A { b?: { c?: number } }
declare const a: A | undefined;
const n: number = a?.b?.c;
const m = a?.b?.c ?? 0;
const k: number = m;
