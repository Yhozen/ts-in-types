type ToArray<T> = T extends any ? T[] : never;
type A = ToArray<string | number>;
const a: A = [1, "x"];
type NoDist<T> = [T] extends [any] ? T[] : never;
const b: NoDist<string | number> = [1, "x"];
