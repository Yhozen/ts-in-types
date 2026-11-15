type A = Exclude<"a" | "b" | "c", "a">;
type B = Extract<"a" | "b" | 1, string>;
type C = NonNullable<string | null | undefined>;
type D = ReturnType<(x: number) => boolean>;
type E = Parameters<(a: string, b: number) => void>;
const a: A = "a";
const c: C = null;
const d: D = 1;
const e: E = ["a", "b"];
