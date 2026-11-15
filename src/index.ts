// The TypeScript 7 compiler as a type: `TS<"source">` runs
// `tsc --noLib --noEmit --skipLibCheck --singleThreaded lib.es5.d.ts main.ts`
// on a main.ts holding the source, inside the type checker (tsrs), and
// evaluates to what tsc prints: its diagnostics, "" for a clean program.
//
// The compiler is the real one: microsoft/typescript-go v7.0.2's Go source,
// compiled to type aliases by go-in-types (image/tsgo.d.ts, built by
// `vp run build`, git-ignored). A check starts from a boot image (the
// command line parsed, the lib parsed and bound, one warm-up check done; a
// reference snapshot turned into a type-level state, image/start.<lib>.d.ts)
// and calls the harness's `checkWarm(main)` with main.ts's text as UTF-8
// bytes (src/utf8.ts).
//
// Hovers: TS<> and TSMini<> run to the end in one alias, refuelling the
// checker's instantiation budget before every chunk (src/hover.ts). CLI
// checks reset that budget per statement, so they chain chunks instead:
//
//   type S0 = TSStart<"const x: number = 'hello';">;
//   type S1 = TSStep<S0>;
//   ...
//   type Out = TSOutput<S60>;   // "(still running)" until the run has ended
import type { GChunk, GDone, GErr, GExit, GOut } from "../image/tsgo.d.ts";
import type { Start as StartEs5 } from "../image/start.es5.d.ts";
import type { Start as StartMini } from "../image/start.mini.d.ts";
import type { Exec } from "./hover.ts";
import type { FromUtf8, Utf8 } from "./utf8.ts";

export type { FromUtf8, Utf8 } from "./utf8.ts";

/** A lib mode: "es5" (TypeScript 7.0.2's lib.es5.d.ts) or "mini" (an 11-line stand-in). */
export type TSLib = "es5" | "mini";

/** tsc's output for main.ts = Source, with the real lib.es5.d.ts. */
export type TS<Source extends string> = TSOutput<Exec<StartEs5<Utf8<Source>>, Source, "0">>;

/** The same with the 11-line stand-in lib (oracle/lib.mini.d.ts): cheaper, fewer globals. */
export type TSMini<Source extends string> = TSOutput<Exec<StartMini<Utf8<Source>>, Source, "1">>;

/** The state that starts a check of Source (CLI chunk form). */
export type TSStart<Source extends string, Lib extends TSLib = "es5"> = Lib extends "mini"
  ? StartMini<Utf8<Source>>
  : StartEs5<Utf8<Source>>;

/** One chunk of a check (~900 trampoline steps): one CLI statement each. A finished state stays as it is. */
export type TSStep<S> = GChunk<S>;

/** Whether a state's run has ended. */
export type TSDone<S> = GDone<S>;

/**
 * What tsc printed, from a state: its stdout once the check has returned
 * (decoded from UTF-8); "(still running)" before the end; "(failed: ...)"
 * when the compiler did not finish normally (a Go panic, or a function the
 * build left out: "trap: ... not kept"); "(out of budget)" when the checker
 * gave up on the state (it is `any`).
 */
export type TSOutput<S> = 0 extends 1 & S
  ? "(out of budget)"
  : [S] extends [never]
    ? "(out of budget)"
    : GDone<S> extends true
      ? GErr<S> extends ""
        ? FromUtf8<GOut<S> & string>
        : `${FromUtf8<GOut<S> & string>}(failed: ${FromUtf8<GErr<S> & string>})`
      : "(still running)";

/** [stdout, stderr, exit status] as byte strings (exit -1 while running), for gates. */
export type TSResult<S> = [GOut<S>, GErr<S>, GExit<S>];
