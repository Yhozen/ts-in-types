type Ret<T> = T extends (...args: any[]) => infer R ? R : never;
type Elem<T> = T extends (infer E)[] ? E : never;
const r: Ret<() => number> = "x";
const e: Elem<string[]> = 1;
