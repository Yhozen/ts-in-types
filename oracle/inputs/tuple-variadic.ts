type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
const c: Concat<[1, 2], [3]> = [1, 2, 3, 4];
function tail<T extends unknown[]>(arr: readonly [unknown, ...T]): T { return null!; }
const t: [number, string] = tail([1, 2, "x"]);
