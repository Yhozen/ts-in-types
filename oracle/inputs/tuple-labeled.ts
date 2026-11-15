type Range = [start: number, end: number];
const r: Range = [1];
function f(...args: Range) {}
f(1, 2, 3);
