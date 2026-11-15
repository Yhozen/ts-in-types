interface R { readonly a: number; b: number }
const r: R = { a: 1, b: 2 };
r.a = 3;
r.b = 4;
const arr: readonly number[] = [1, 2];
arr[0] = 5;
const m: number[] = arr;
