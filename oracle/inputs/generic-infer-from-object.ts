declare function keys<T extends object>(o: T): (keyof T)[];
const k = keys({ a: 1, b: 2 });
const s: ("a" | "c")[] = k;
