type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
declare const d: DeepReadonly<{ a: { b: { c: number } } }>;
d.a.b.c = 1;
