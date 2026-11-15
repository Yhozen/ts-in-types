type Split<S extends string> = S extends `${infer A}.${infer B}` ? [A, ...Split<B>] : [S];
const s: Split<"a.b.c"> = ["a", "b", "x"];
