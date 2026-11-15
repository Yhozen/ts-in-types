// A run to its end in one alias, for hovers (the engine's `GExec`, with the
// start in the fuel pool chosen per source).
//
// The checker gives up (returns `any`) after ~5M instantiations since its
// counter was last zeroed, and a hover zeroes it only when a literal type
// node is resolved for the first time. So before every chunk the run looks
// up a fresh node of the engine's fuel pool (20,000 nodes, one per chunk;
// go-in-types docs/EMIT.md "Fuel"). Starting every run at node 0 would make
// a second check in the same editor session find those nodes already
// resolved and run out of budget, so the start node comes from a hash of the
// source (two Pearson hashes of its first 1,800 characters, seeded per lib
// mode). A run that reaches the end of the pool goes on from node 0.
import type { GDone, GExec } from "../image/tsgo.d.ts";
import type { Code, KStart, M1, M2 } from "./hover.gen.ts";

type X100 =
  "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
type F900 = `${X100}${X100}${X100}${X100}${X100}${X100}${X100}${X100}${X100}`;

/** One character into both hashes (characters above U+00FF leave them as they are). */
type Mix<A extends string, B extends string, ch> = ch extends keyof Code
  ? [M1[A & keyof M1][Code[ch]], M2[B & keyof M2][Code[ch]]]
  : [A, B];

/**
 * [h1, h2] of S (its first 1,800 characters, two per step), from A and B.
 * Bindings stay flat: nesting the lookups in one expression makes the
 * checker check the alias in exponential time.
 */
type Hash<
  S extends string,
  A extends string,
  B extends string,
  F extends string = F900,
> = F extends `x${infer F2}`
  ? S extends `${infer c0}${infer c1}${infer R}`
    ? Mix<A, B, c0> extends [infer A1 extends string, infer B1 extends string]
      ? Mix<A1, B1, c1> extends [infer A2 extends string, infer B2 extends string]
        ? Hash<R, A2, B2, F2>
        : never
      : never
    : Mix<A, B, S> extends [infer A1 extends string, infer B1 extends string]
      ? [A1, B1]
      : never
  : [A, B];

/** The fuel-pool chunk (an int) a run of Source starts at, for lib mode seed Seed ("0".."63"). */
export type PoolStart<S extends string, Seed extends string> =
  Hash<S, Seed, Seed> extends [infer A extends keyof KStart, infer B extends string]
    ? KStart[A][B & keyof KStart[A]] & string
    : "0";

/** Run state S0 (the start of a check of Source) to its end, refuelling before every chunk. */
export type Exec<S0, Source extends string, Seed extends string> =
  GExec<S0, PoolStart<Source, Seed>> extends infer S
    ? GDone<S> extends true
      ? S
      : GExec<S, "0">
    : never;
