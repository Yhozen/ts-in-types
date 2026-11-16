// tsc, running inside the type checker. Each type below runs the real
// TypeScript 7 compiler (typescript-go v7.0.2, its Go source compiled to
// type aliases by go-in-types) on the program in quotes, with the real
// lib.es5.d.ts, and evaluates to what tsc prints. TypeScript 7 is strict by
// default. Hover a name; the comment above it is what the hover shows (each
// takes a second or two). Needs the image: `vp run build`.
import type { TS } from "../src/index.ts";

// "main.ts(1,5): error TS2322: Type 'string' is not assignable to type 'number'.\n"
export type TypeError = TS<'let n: number = "forty-two";'>;

// The spelling suggestion compares names by edit distance, in soft floats.
// "main.ts(3,6): error TS2551: Property 'emial' does not exist on type 'User'. Did you mean 'email'?\n"
export type DidYouMean =
  TS<"interface User { name: string; email: string }\ndeclare const user: User;\nuser.emial;">;

// The suggestion here is a lib member: tsc reads its position in the 230 KB
// lib.es5.d.ts text, sliced through string views.
// "main.ts(1,9): error TS2551: Property 'toUppercase' does not exist on type '\"hello\"'. Did you mean 'toUpperCase'?\n"
export type DidYouMeanLib = TS<'"hello".toUppercase();'>;

// "main.ts(2,7): error TS2741: Property 'age' is missing in type '{ name: string; }' but required in type 'User'.\n"
export type MissingProperty =
  TS<'interface User { name: string; age: number }\nconst ada: User = { name: "Ada" };'>;

// "main.ts(2,9): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.\n"
export type Inference = TS<'function pair<T>(a: T, b: T): T[] { return [a, b]; }\npair(1, "two");'>;

// "main.ts(2,7): error TS2322: Type '\"home\"' is not assignable to type '`/${string}`'.\n"
export type TemplateLiteral = TS<'type Route = `/${string}`;\nconst home: Route = "home";'>;

// "main.ts(2,26): error TS2366: Function lacks ending return statement and return type does not include 'undefined'.\n"
export type NotExhaustive =
  TS<'type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };\nfunction area(x: Shape): number {\n  switch (x.kind) {\n    case "circle": return 3 * x.r * x.r;\n  }\n}'>;

// "main.ts(1,35): error TS18048: 's' is possibly 'undefined'.\n"
export type PossiblyUndefined = TS<"function len(s?: string) { return s.length; }">;

// "main.ts(2,4): error TS2339: Property 'push' does not exist on type 'readonly number[]'.\n"
export type Readonly = TS<"const xs: readonly number[] = [1, 2, 3];\nxs.push(4);">;

// The source goes in as UTF-8 and positions count UTF-16 units, as in tsc.
// "main.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.\n"
export type Unicode = TS<'const 名前: number = "エイダ";'>;
