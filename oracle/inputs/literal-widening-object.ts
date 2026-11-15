const o = { kind: "circle", r: 1 };
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };
const s: Shape = o;
const s2: Shape = { kind: "circle", r: 1 };
