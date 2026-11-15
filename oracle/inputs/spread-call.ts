function f(a: number, b: number) {}
const xs = [1, 2];
f(...xs);
const ys: [number, number] = [1, 2];
f(...ys);
