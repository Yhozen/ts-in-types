# ts-in-types: plan

`TS<"const x: number = 'hello';">` hovers as
`main.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.`,
computed by the real TypeScript 7 compiler (Go source) compiled by go-in-types
into type aliases. Stages 3 and 6 of `vendor/go-in-types/docs/PLAN.md` live
here.

## Inputs

- `oracle/inputs/`: the 328 inputs from ts-in-lua-in-types (hand-written,
  `upstream/` TypeScript cases kept byte for byte, `extreme/`).
- Lib modes: `mini` (`oracle/lib.mini.d.ts`, tslua's 11-line stand-in) and
  `es5` (`oracle/lib.es5.d.ts`, from typescript 7.0.2).
- Command line: `--noLib --noEmit --skipLibCheck --singleThreaded <lib> main.ts`.

## Stage 3: TypeScript 7 on the reference

1. Oracle: `oracle/expected/<lib>/<input>.out` and `oracle/manifest.json`
   from native `tsc` 7.0.2 (stdout + exit status). Census found 2 inputs where
   the old tslua expectations were wrong; these come from tsc.
2. Harness: `check(files, args) -> output, status` on the reference
   interpreter (the go-in-types tsgo IR, entry `check`).
3. Gate A: 656/656 exact on the reference, fresh.
4. Boot image: a reference snapshot after package init, libs parsed and
   bound, the command line parsed (40% of the warm one-liner is option
   parsing, OPS.md), and one warm-up check; later checks start from it and
   reuse lib source files. Gate B: 656/656 from the image; the one-liner's
   ops from the image recorded.
5. Profile (`docs/PROFILE.md`): ops by phase/package/function, from the
   image, over all inputs; median and max; what to optimise first.

## Stage 6 (later)

Image build in types, `TS<>` hover/CLI, fuel pool seeded by a hash of the
source, tiered gates, demo files, README.
