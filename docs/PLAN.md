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

**Result (2026-11-15): gates A and B passed.** Oracle: 656 checks from
native tsc 7.0.2 (`scripts/oracle.ts`, `--verify` reproduces them; 161
exit 0, 495 exit 1). Gate A (`scripts/ref.ts`, fresh): 656/656 exact with
no engine fixes. Boot image: go-in-types branch `stage3-engine` adds the
harness entries `boot` + `checkWarm` and `Machine.callEntry`; native
parity 656/656 with and without `--warm`. Images (`scripts/boot.ts`):
3.4 MB (mini), 6.1 MB (es5). Gate B (`scripts/ref.ts --image`): 656/656.
The one-liner: fresh 1,351,479 ops (mini) / 21,880,822 (es5), package init
1,003,846 of each; from the image 96,689 / 116,638 (stage 0's warm SSA
count: 161,615 / 190,063 with option parsing). Median check from the
image 202k (mini) / 226k (es5), max 245M. Profile and the comparison with
stage 0: `docs/PROFILE.md`.

## Stage 6 (later)

Image build in types, `TS<>` hover/CLI, fuel pool seeded by a hash of the
source, tiered gates, demo files, README.
