const a = [1, 2, 3] as const;
a.push(4);
const o = { x: 1, y: [1, 2] } as const;
o.x = 2;
const n: 1 = o.x;
