type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];
type K = KeysOfType<{ a: number; b: string; c: number }, number>;
const k: K = "b";
