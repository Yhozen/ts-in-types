type Reverse<T extends unknown[]> = T extends [infer H, ...infer R] ? [...Reverse<R>, H] : [];
const r: Reverse<[1, 2, 3]> = [1, 2, 3];
