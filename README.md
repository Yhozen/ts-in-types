# ts-in-types

The real TypeScript 7 compiler, running inside the TypeScript type checker.

```ts
import type { TS } from "./src/index.ts";

type Out = TS<"const x: number = 'hello';">;
// hover: "main.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.\n"
```

`TS<Source>` runs `tsc --noLib --noEmit --skipLibCheck --singleThreaded
lib.es5.d.ts main.ts` on a `main.ts` that holds `Source`, and the type it
evaluates to is what `tsc` prints. No JavaScript runs at check time. The
compiler is [typescript-go](https://github.com/microsoft/typescript-go)
v7.0.2, the Go source of TypeScript 7 itself, compiled to type aliases by
[go-in-types](vendor/go-in-types) (Go → SSA → one alias per basic-block
segment) and run by tsrs, a TypeScript 7 type checker. It is an experiment
in how far the type system goes, not a tool. The previous route went
through a Lua port of the checker (`../ts-in-lua-in-types`); this one runs
the compiler's own code.

## Where it stands

- **It works.** The one-liner hovers as TS2322 in both lib modes,
  computed by the real compiler in the type checker: 5.5 s with the real
  `lib.es5.d.ts` and 5.0 s with the stand-in lib, in a fresh editor
  session (server start and loading the image included), ~1.25 GB.
- The gate (`vp run gate:types -- --full`) checks all 328 oracle inputs in
  both lib modes through the CLI and compares stdout and exit status with
  native `tsc` 7.0.2 byte for byte: **640 of 656 pass** (97.6%,
  [`docs/GATE.md`](docs/GATE.md)). All 16 failures are one class: a
  single chunk needs more than the checker's 5M instantiations (TS2589).
- A check costs ~60 instantiations per Go operation; the median check
  (~160k ops) takes ~1.5 s of checking and ~1.1 GB.

## Use it

```sh
vp install
vp run build    # image/: the compiler in types and its start states
```

`vp run build` needs the go-in-types engine (`$GO_IN_TYPES`, or the
submodule `vendor/go-in-types`) and Go, to build the compiler's IR.

### In VS Code

1. Install the recommended extension, **TypeScript (Native Preview)**
   (`TypeScriptTeam.native-preview`, listed in `.vscode/extensions.json`).
2. Open the repository folder and trust the workspace.
3. `.vscode/settings.json` sets `"js/ts.experimental.useTsgo": true` and
   `"js/ts.tsdk.path": "./tsdk"`; `tsdk/tsgo` starts tsrs's language server
   with `TSRS_FAST=1`. If VS Code asks which TypeScript to use, choose
   **Use Workspace Version**. (The server was driven from a terminal here,
   not clicked through in VS Code.)
4. Open `examples/demo.ts` or `examples/hello.ts` and hover a type name.
   The comment above each one is what the hover shows.

From a terminal, `scripts/hover.ts` drives `tsrs --lsp` the same way, one
session for all the names, and `scripts/tsc.ts` is the CLI form:

```sh
node scripts/hover.ts examples/demo.ts TypeError DidYouMean MissingProperty
node scripts/tsc.ts "let n: number = 'forty-two';"
node scripts/tsc.ts --lib mini --file some.ts
```

Measured with `scripts/hover.ts` (`tsrs --lsp`, `TSRS_FAST=1`, Apple
silicon):

| hover                                               | time           | server peak         |
| --------------------------------------------------- | -------------- | ------------------- |
| `examples/hello.ts` `Out` (es5), fresh session      | 5.5 s          | 1.25 GB             |
| `examples/hello.ts` `OutMini` (mini), fresh session | 5.0 s          | 1.23 GB             |
| the 9 names of `examples/demo.ts`, one session      | 0.2–1.8 s each | 1.84 GB after all 9 |

The first hover of a session includes loading the image (~4 s); later ones
cost only their run. Times vary with machine load: one run's `Inference`
took 17 s while the others took under 2 s.

### The API (`src/index.ts`)

| type                               | what                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `TS<Source>`                       | tsc's output with the real `lib.es5.d.ts` (one alias, for hovers)                          |
| `TSMini<Source>`                   | the same with an 11-line stand-in lib                                                      |
| `TSStart<Source, "es5" \| "mini">` | the start state, for the CLI                                                               |
| `TSStep<S>`                        | one chunk (~900 trampoline steps): chain `type S1 = TSStep<S0>; ...`, one per statement    |
| `TSOutput<S>`                      | the output once done; `"(still running)"`, `"(failed: ...)"` or `"(out of budget)"` if not |
| `TSResult<S>`                      | `[stdout, stderr, exit]` as byte strings (exit `-1` while running), for gates              |

Sources can be any text: `src/utf8.d.ts` encodes them to UTF-8 at the type
level (ASCII passes through; the BMP and plane 1 go through tables, so emoji
work; other planes become U+FFFD) and decodes the output. Positions in the
output count UTF-16 units, as in `tsc`.

## How it works

- **Boot image.** go-in-types' reference interpreter runs the harness's
  `boot`: package init, the command line parsed, the lib parsed and bound,
  one warm-up check (`scripts/boot.ts`). Its snapshot becomes a type-level
  heap.
- **Start state.** `image/start.<lib>.d.ts` exports
  `Start<Src extends string>`: that heap plus a call of the harness's
  `checkWarm(main)` with `Src` as the argument (go-in-types codec-state
  `callState`), so one module starts any check.
- **The program.** `image/tsgo.d.ts` is the compiler's IR emitted as type
  aliases with a **keep list** (`scripts/keep.ts`): the 5,679 functions the
  reference runs over all 656 checks get bodies; the other ~11k become
  traps ("not kept").
- **Hovers** refuel the checker's 5M-instantiation budget before every
  chunk from the engine's pool of 20,000 literal type nodes. A node works
  once per session, so `src/hover.ts` starts each run at a node picked by a
  Pearson hash of the source, and several checks in one editor session
  don't collide.
- Everything the checker loads is a `.d.ts` under `skipLibCheck`, so only
  what runs is resolved.

## What it costs

| piece (`image/`, git-ignored)                  | size          | built in |
| ---------------------------------------------- | ------------- | -------- |
| IR (`go-in-types` frontend, 16,984 funcs)      | 50 MB JSON    | ~8 s     |
| boot images (reference interpreter, both libs) | 3.5 / 6.2 MB  | ~2–8 s   |
| keep list (reference over 656 checks)          | 5,679 funcs   | ~16 s    |
| `tsgo.d.ts` program + entries                  | 36.7 + 6.4 MB | ~2 s     |
| `rt/` runtime                                  | 5.1 MB        | copied   |
| `start.mini.d.ts` (7,814 heap objects)         | 4.4 MB        | <1 s     |
| `start.es5.d.ts` (9,429 heap objects)          | 10.0 MB       | ~1 s     |
| `utf8.gen.d.ts` (UTF-8 tables)                 | 8.4 MB        | <1 s     |

A whole build takes ~30 s (~45 s with the IR and boot images). Per check,
from the gate: ~60 instantiations per reference op (35–91); median 80–88
chunks, 9–10M instantiations, ~1.5 s of checking and ~1.1 GB.

### Limits

- A diagnostic whose related location is in `lib.es5.d.ts` (a spelling
  suggestion for a lib member, "declared here") makes the scanner skip the
  lib's trivia, and every `text[pos:]` of the 230 KB lib text is a fresh
  string whose length and index cost ~0.5M instantiations: a chunk runs out
  of budget (TS2589). `"hello".toUppercase()` hits it; the demo's spelling
  suggestion uses a type of its own. Fixing it needs string views
  (offset + base) in go-in-types.
- 16 gate checks fail when one chunk needs more than 5M instantiations.
  12 of them passed before go-in-types started building saved registers
  and call arguments with `R.TPush` (the stage 5 fix for TS2589 depth with
  deferred tuples, which fixed 10 others here). In those chunks the state
  costs ~5M and the peak doubles to ~2.6 GB, for example in
  `structuredTypeRelatedToWorker` resuming with 11 live registers. The
  other four are `extreme/` inputs.

## Scripts

| command                   | what                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `vp run build`            | `scripts/build.ts`: everything under `image/` (`--force` rebuilds)                       |
| `vp run gate:types`       | `scripts/types-gate.ts`: smoke (10 inputs, 2 libs); `--tier 20`; `--full --resume --doc` |
| `vp run hover -- FILE T…` | `scripts/hover.ts`: hover through `tsrs --lsp`, one session                              |
| `vp run tsc -- "source"`  | `scripts/tsc.ts`: one check in the CLI chunk form                                        |
| `vp run keep`             | `scripts/keep.ts`: the keep list (part of the build)                                     |
| `vp run gen:hover`        | `scripts/gen-hover.ts`: the hash tables of `src/hover.gen.ts`                            |
| `vp run ref`, `oracle`, … | the stage 3 reference and oracle scripts (`AGENTS.md`)                                   |

`docs/PLAN.md` has the plan and the measurements behind it.
