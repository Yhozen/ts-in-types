// TypeScript 7 running inside the type checker. Hover `Out` to run the real
// tsc (microsoft/typescript-go v7.0.2, its Go source compiled to type
// aliases) on the program in quotes, with the real lib.es5.d.ts; the hover
// shows what tsc prints. Needs the image: `vp run build` (once). From a
// terminal: `node scripts/hover.ts examples/hello.ts Out`.
import type { TS, TSMini } from "../src/index.ts";

// "main.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.\n"
export type Out = TS<"const x: number = 'hello';">;

// The same with an 11-line stand-in lib (oracle/lib.mini.d.ts).
// "main.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.\n"
export type OutMini = TSMini<"const x: number = 'hello';">;

// A clean program prints nothing.
// ""
export type Clean = TS<"const answer: number = 6 * 7;">;
