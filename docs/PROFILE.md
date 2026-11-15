# Profile: TypeScript 7 on the reference interpreter

Where a check's operations go when the real compiler (tsgo v7.0.2, Go)
runs on go-in-types' reference interpreter, from the boot image
(`scripts/boot.ts`), over the 328 oracle inputs in both lib modes. One op
is one executed IR instruction (go-in-types `docs/DESIGN.md`); an
intrinsic call is 1 op. Regenerate the tables with
`node scripts/boot.ts && node scripts/profile.ts` (data:
`oracle/profile.json`); the prose here is hand-written.

## Headline

Measured with go-in-types branch `stage3-diet` (the "op diet": overlays
that cut ops per check without changing output; the stage 3 baseline
numbers are in parentheses).

- **The one-liner from the image: 69,906 ops (mini), 88,779 (es5)**
  (96,689 / 116,638), vs 1.31M / 16.7M fresh (1.35M / 21.9M; package init
  1.01M of both). The image keeps the parsed command line, so the 77k ops
  of option parsing (40% of stage 0's warm check, almost all
  `strings.ToLower`) are gone.
- **Median check from the image: 156k ops (mini), 173k (es5)** (202k /
  226k); p90 426k / 521k (641k / 667k); max 75M
  (`extreme/deep-recursion.ts`; it was 245M, `template-cross-product`,
  now 42M). Without the four `extreme/` inputs the 324 es5 checks total
  82M (118M).
- **The diet, per optimisation** (es5 ops from the image; go-in-types
  commits on `stage3-diet`, each with native parity 656/656 cold and
  warm and both reference gates 656/656):

  | optimisation                                                         | one-liner | median | non-extreme total |
  | -------------------------------------------------------------------- | --------: | -----: | ----------------: |
  | xxh3 overlay interns its input instead of hashing                    |   −12,046 | −17.6k |             −9.2M |
  | `levenshteinWithMax` on float bit patterns, memoised arithmetic      |         0 |  −7.2k |            −14.7M |
  | `math.IsNaN`/`IsInf` bit tests; jsnum bit-level fast paths           |       −59 |  −2.5k |             −1.6M |
  | `checkWarm` reuses the boot FS (path queries memoised in the image)  |    −9,527 |  −9.5k |             −3.1M |
  | `tspath.hasRelativePathSegment`: fast "no" with substring searches   |    −3,415 |  −3.4k |             −0.7M |
  | `ForEachChild` and kind predicates as `Kind` tables (`gen-ast.ts`)   |    −2,451 |  −7.9k |             −5.6M |
  | scanner: identifier fast path, `scanASCIIWhile` predicates as tables |      −361 |  −4.4k |             −1.0M |

  Spelling suggestions dominated the extreme inputs: `template-cross-
  product` 245M → 42M, `large-unions` 13.6M → 4.8M.

- **Per check, the fixed cost is checker creation**: 34.3k ops (es5) /
  26.9k (mini) of the one-liner, 39%: merging the lib's globals into a new
  checker, resolving the global types (`getGlobalType`, ~10k) and building
  its fixed unions (`getUnionType`, ~9k). It is per program in tsgo; reusing
  it would mean cloning a checker's state (types, links, caches) or
  reordering `initializeChecker` (merge the lib first, then `main.ts`),
  which changes results whenever `main.ts` augments a global (`interface
  Array<T>`, `declare global`) — not done.
- **Remaining targets** (ops are the reference's; the type level pays per
  op and, for intrinsics, per byte):
  1. **Switch chains, ~15% of non-extreme es5 ops**: go/ssa lowers a
     `switch` to a chain of `==` comparisons, two ops per case; 12.8M of
     82.8M ops are such compares and their `if`s (`Scanner.Scan`,
     `Binder.bind`, `NameResolver.Resolve`, `bindChildren`,
     `GetContainerFlags`, `checkSourceElementWorker`, `Node.Type`, ...).
     The overlays fixed `ForEachChild` and 40 kind predicates; a
     front-end lowering of constant switches (binary search or a table)
     would cover all of them.
  2. Parsing and binding `main.ts` (phases parse + bind, 25% of
     non-extreme ops) and `ast.GetSourceFileOfNode` parent walks are
     ordinary compiler work.
  3. **xxh3 is down to 1% (non-extreme)**: what is left is the checker's
     own `hashWrite32`/`hashWrite64` building byte slices for the cache
     keys (in `checker.go`, not overlaid).
  4. **Soft float is down to 0.7% (non-extreme)**: `jsnum`'s remaining
     conversions and the memo misses of the spelling suggestions.
  5. **String intrinsics**: almost all of the 474k `cmpstring` calls are
     in two extreme inputs (`deep-recursion`: `compareSymbolsWorker` 300k
     calls and `CompareTypes` in a binary search 166k, on symbol and type
     names: 2.6 MB of operands but 0.9 MB up to the first difference);
     the 324 other inputs make 8k calls over 0.1 MB. `IndexByteString`'s
     1.7 MB is `scanString`'s `IndexByte` for the closing quote, counted
     as the rest of the file (the bytes actually scanned stop at the
     quote).
- Event mix (non-extreme es5): see the events table below.

## Reference vs stage 0's SSA counter (the one-liner)

(Written for the stage 3 baseline, before the diet: the xxh3 and harness
FS differences below are gone now; the tables are current.)

Stage 2's gate left open whether the reference's op counts match the
stage 0 counter (go/ssa/interp, `docs/stage0/OPS.md` in go-in-types). They
are not the same pipeline: stage 0 interprets go/ssa directly with
externals (xxh3, atomics, `MakeNoZero`, `maps.clone`), skips most std
initialisers and uses its own minimal FS and a phased harness; the
reference runs the front end's IR (soft float, intrinsics, the go-in-types
std overlays) and the tsgo harness. On the es5 warm check (stage 0
190,063 incl. option parsing; reference 116,638 from the image):

- **Functions whose work doesn't depend on the differences agree exactly**:
  `newType` 2,175, `ForEachChild` 2,063, `mergeGlobalSymbol` 1,872,
  `initializeChecker` 1,678, `CompareTypes` 1,310, `Scanner.Scan` 1,235,
  `NameResolver.Resolve` 1,164, `getMergedSymbol` 1,126, `addTypeToUnion`
  1,053, `Binder.bind` 952, `NewChecker` 892, `isDeclarationContainedBy`
  882 — 12 of stage 0's top 30 functions, op for op. Phases agree within
  the sampling (128 ops): options 77.2k vs 77,101, parse `main.ts` 9.5k
  vs 10.1k, bind 3.7k vs 3.8k; checker creation + check 69.8k vs 66.7k
  (xxh3 counted here, more sorting there; the phase boundary between the
  two is drawn differently).
- **Option parsing (−73k)**: stage 0's warm check parses the command line
  again; the image doesn't (`strings` −68.8k, `tsoptions` −3.6k,
  `OrderedMap.Set` in `collections` −3.0k, most of `strings.Builder`).
- **xxh3 (+12.9k)**: an external in stage 0, the pure-Go overlay here.
- **Intrinsics (`internal/bytealg` −7.1k)**: `CountString`,
  `IndexByteString` are loops in stage 0 (portable Go) and 1 op here.
- **Map iteration order (checker −2.6k, ast −4.6k)**: Go randomises it and
  stage 0 ran real Go maps, the reference iterates in insertion order
  (DESIGN.md). Merged globals then arrive in declaration order and sorting
  them is cheaper: `compareSymbolsWorker` 2,324 → 644,
  `insertionSortCmpFunc[*ast.Symbol]` 1,007 → 6, `compareNodes`
  1,162 → 322, `GetSourceFileOfNode` 5,115 → 1,515, `TextRange.Pos`
  1,050 → 330. (OPS.md already saw 31.7k–35.7k for the check phase over
  10 runs for this reason.)
- **Harness FS (+~8k)**: `tspath` +2.3k (`hasRelativePathSegment` 4,270 →
  6,258), `io/fs` +1.6k, `vfs/vfstest` +1.2k, `testing/fstest` +0.9k,
  `unicode/utf8` +1.0k: the tsgo harness builds a `vfstest` FS per check,
  stage 0 used a flat map.
- **Overlays**: `regexp` −2.3k and `internal/sync` −0.6k are gone from the
  check path (go-in-types' tsgo and `sync` overlays).
- Fresh, the same differences minus option parsing: mini check 347,633 vs
  334,066 (options → print); es5 20.88M vs 22.32M (parse 16.99M vs 18.43M:
  `IndexByteString` and `ContainsNonASCII`-style byte loops are
  intrinsics here). Package init 1,003,846 vs 1,077,976 (different std
  overlays; stage 0 skipped the runtime/OS initialisers entirely).

So the reference's counts are consistent with stage 0 wherever the two
execute the same Go code; every difference is attributable to option
parsing, externals vs pure Go, intrinsics, map order or the harness.

## Tables

<!-- generated by scripts/profile.ts: begin -->

### The one-liner

|                                          |          mini |            es5 |
| ---------------------------------------- | ------------: | -------------: |
| fresh: package init                      |     1,012,925 |      1,012,925 |
| fresh: check (options → print)           |       292,330 |     15,685,113 |
| **fresh total**                          | **1,305,255** | **16,698,038** |
| boot (init + boot entry, warm-up check)  |     1,307,362 |     16,700,137 |
| **from the image (checkWarm)**           |    **69,906** |     **88,779** |
| stage 0 SSA, warm (options parsed again) |       161,615 |        190,063 |

Phases (sampled every 128 ops on the innermost recognised frame):

| phase                                | mini fresh | mini image |  es5 fresh | es5 image |
| ------------------------------------ | ---------: | ---------: | ---------: | --------: |
| package init                         |  1,012,864 |          0 |  1,012,864 |         0 |
| options (ParseCommandLine)           |     77,184 |          0 |     77,312 |         0 |
| harness: in-memory FS                |      1,792 |          0 |      1,664 |         0 |
| parse                                |    110,720 |      7,168 | 12,296,448 |     7,040 |
| bind                                 |     35,456 |      3,584 |  3,223,552 |     3,584 |
| checker creation (globals merge)     |     26,752 |     26,880 |     34,560 |    34,304 |
| check main.ts                        |     11,776 |     11,648 |     22,784 |    22,784 |
| sort + print diagnostics             |      4,736 |      4,608 |      4,864 |     4,864 |
| program setup (file loader)          |     20,480 |     12,928 |     20,480 |    13,056 |
| other diagnostics                    |        640 |        640 |        768 |       512 |
| harness glue (run, diagnostics loop) |      2,855 |      2,450 |      2,742 |     2,635 |

### The es5 one-liner from the image vs stage 0's warm check, by package

| package                                     | reference (image) | stage 0 (warm) | difference |
| ------------------------------------------- | ----------------: | -------------: | ---------: |
| strings                                     |             3,001 |         71,992 |    -68,991 |
| internal/bytealg                            |               842 |          8,401 |     -7,559 |
| ast                                         |            10,019 |         17,046 |     -7,027 |
| tspath                                      |             4,451 |          8,621 |     -4,170 |
| tsoptions                                   |               508 |          4,144 |     -3,636 |
| collections                                 |               731 |          3,793 |     -3,062 |
| checker                                     |            34,199 |         36,839 |     -2,640 |
| regexp                                      |                 0 |          2,301 |     -2,301 |
| slices                                      |             4,169 |          5,811 |     -1,642 |
| zeebo/xxh3                                  |               809 |              0 |       +809 |
| core                                        |             6,513 |          7,222 |       -709 |
| internal/sync                               |                 0 |            627 |       -627 |
| diagnostics                                 |               676 |            136 |       +540 |
| time                                        |               462 |              0 |       +462 |
| microsoft/typescript-go/cmd/tsgo            |               436 |              0 |       +436 |
| scanner                                     |             2,388 |          2,749 |       -361 |
| bytes                                       |               239 |              0 |       +239 |
| sync                                        |               944 |          1,173 |       -229 |
| microsoft/typescript-go/cmd/opsharness      |                 0 |            224 |       -224 |
| execute/tsc                                 |               287 |             75 |       +212 |
| fmt                                         |             1,465 |          1,625 |       -160 |
| internal/stringslite                        |             1,432 |          1,272 |       +160 |
| sync/atomic                                 |               207 |            341 |       -134 |
| golang.org/x/text/internal/language/compact |                 0 |            116 |       -116 |
| sort                                        |                 0 |            116 |       -116 |
| **total**                                   |        **88,779** |    **190,063** |   -101,284 |

Stage 0's top functions (warm es5 check) on the reference, es5 one-liner from the image:

| stage 0 | reference | function                                                              |
| ------: | --------: | --------------------------------------------------------------------- |
|  55,642 |        62 | `strings.ToLower`                                                     |
|   5,791 |       473 | `(*strings.Builder).copyCheck`                                        |
|   5,634 |         0 | `internal/bytealg.CountString`                                        |
|   5,115 |     1,515 | `ast.GetSourceFileOfNode`                                             |
|   4,270 |       165 | `tspath.hasRelativePathSegment`                                       |
|   2,990 |         0 | `(*collections.OrderedMap[string, *tsoptions.CommandLineOption]).Set` |
|   2,640 |       256 | `(*strings.Builder).WriteString`                                      |
|   2,324 |       644 | `(*checker.Checker).compareSymbolsWorker`                             |
|   2,255 |        55 | `(*strings.Builder).WriteByte`                                        |
|   2,175 |     2,175 | `(*checker.Checker).newType`                                          |
|   2,063 |       139 | `(*ast.Node).ForEachChild`                                            |
|   1,872 |     1,872 | `(*checker.Checker).mergeGlobalSymbol`                                |
|   1,856 |       160 | `(*strings.Builder).grow`                                             |
|   1,825 |         0 | `tsoptions.GetNameMapFromList`                                        |
|   1,740 |       150 | `(*strings.Builder).Grow`                                             |
|   1,678 |     1,678 | `(*checker.Checker).initializeChecker`                                |
|   1,647 |         0 | `internal/bytealg.IndexByteString`                                    |
|   1,310 |     1,310 | `checker.CompareTypes`                                                |
|   1,235 |       967 | `(*scanner.Scanner).Scan`                                             |
|   1,164 |     1,164 | `(*binder.NameResolver).Resolve`                                      |
|   1,162 |       322 | `(*checker.Checker).compareNodes`                                     |
|   1,126 |     1,126 | `(*checker.Checker).getMergedSymbol`                                  |
|   1,053 |     1,053 | `(*checker.Checker).addTypeToUnion`                                   |
|   1,050 |       330 | `(core.TextRange).Pos`                                                |
|   1,007 |         6 | `slices.insertionSortCmpFunc[*ast.Symbol]`                            |
|     952 |       952 | `(*binder.Binder).bind`                                               |
|     926 |         0 | `tsoptions.parseCompilerOptions`                                      |
|     892 |       892 | `checker.NewChecker`                                                  |
|     882 |       882 | `(*checker.Checker).isDeclarationContainedBy`                         |
|     882 |       816 | `internal/bytealg.LastIndexByteString`                                |

Top functions, es5 one-liner from the image:

|   ops |   % | function                                                                 |
| ----: | --: | ------------------------------------------------------------------------ |
| 2,175 | 2.4 | `(*checker.Checker).newType`                                             |
| 1,872 | 2.1 | `(*checker.Checker).mergeGlobalSymbol`                                   |
| 1,678 | 1.9 | `(*checker.Checker).initializeChecker`                                   |
| 1,515 | 1.7 | `ast.GetSourceFileOfNode`                                                |
| 1,310 | 1.5 | `checker.CompareTypes`                                                   |
| 1,164 | 1.3 | `(*binder.NameResolver).Resolve`                                         |
| 1,126 | 1.3 | `(*checker.Checker).getMergedSymbol`                                     |
| 1,053 | 1.2 | `(*checker.Checker).addTypeToUnion`                                      |
|   967 | 1.1 | `(*scanner.Scanner).Scan`                                                |
|   952 | 1.1 | `(*binder.Binder).bind`                                                  |
|   892 | 1.0 | `checker.NewChecker`                                                     |
|   882 | 1.0 | `(*checker.Checker).isDeclarationContainedBy`                            |
|   816 | 0.9 | `internal/bytealg.LastIndexByteString`                                   |
|   788 | 0.9 | `internal/stringslite.Index`                                             |
|   782 | 0.9 | `(*checker.Checker).getNamedMembers`                                     |
|   758 | 0.9 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |
|   756 | 0.9 | `(core.TextRange).ContainedBy`                                           |
|   748 | 0.8 | `checker.hashWrite32[checker.TypeId]`                                    |
|   737 | 0.8 | `(*checker.Checker).addTypesToUnion`                                     |
|   698 | 0.8 | `tspath.ToFileNameLowerCase`                                             |
|   670 | 0.8 | `tspath.GetEncodedRootLength`                                            |
|   646 | 0.7 | `checker.hashWrite64[int]`                                               |
|   644 | 0.7 | `(*checker.Checker).compareSymbolsWorker`                                |
|   642 | 0.7 | `core.ComputeECMALineStartsSeq$1`                                        |
|   630 | 0.7 | `checker.getSortOrderFlags`                                              |

### All inputs from the image, mini

328 checks: median 155,887 ops, p90 426,480, max 69,359,527, min 47,661, total 186,289,359; 5594 functions executed.

| phase                                |         ops |    % |
| ------------------------------------ | ----------: | ---: |
| check main.ts                        | 146,252,544 | 78.5 |
| parse                                |  16,103,680 |  8.6 |
| checker creation (globals merge)     |   8,466,560 |  4.5 |
| bind                                 |   6,001,664 |  3.2 |
| program setup (file loader)          |   4,262,144 |  2.3 |
| sort + print diagnostics             |   3,895,680 |  2.1 |
| harness glue (run, diagnostics loop) |   1,126,991 |  0.6 |
| other diagnostics                    |     180,096 |  0.1 |

| package              |         ops |    % |
| -------------------- | ----------: | ---: |
| checker              | 106,308,784 | 57.1 |
| core                 |  17,395,544 |  9.3 |
| slices               |  12,918,223 |  6.9 |
| ast                  |  10,979,167 |  5.9 |
| scanner              |   6,637,480 |  3.6 |
| binder               |   5,585,804 |  3.0 |
| parser               |   5,092,051 |  2.7 |
| strings              |   3,273,167 |  1.8 |
| zeebo/xxh3           |   2,486,671 |  1.3 |
| gointypes/softfloat  |   2,049,600 |  1.1 |
| tspath               |   1,672,350 |  0.9 |
| compiler             |   1,645,276 |  0.9 |
| internal/bytealg     |   1,236,748 |  0.7 |
| stringutil           |   1,209,314 |  0.6 |
| fmt                  |   1,055,845 |  0.6 |
| internal/strconv     |     967,090 |  0.5 |
| printer              |     882,519 |  0.5 |
| unicode              |     774,253 |  0.4 |
| internal/stringslite |     567,760 |  0.3 |
| diagnostics          |     518,521 |  0.3 |

|        ops |    % | function                                                                 |
| ---------: | ---: | ------------------------------------------------------------------------ |
| 19,450,015 | 10.4 | `checker.CompareTypes`                                                   |
| 11,119,989 |  6.0 | `(*checker.ArrayTypeMapper).Map`                                         |
|  9,252,688 |  5.0 | `(*checker.Checker).compareSymbolsWorker`                                |
|  7,627,766 |  4.1 | `checker.getTypeNameSymbol`                                              |
|  5,107,764 |  2.7 | `checker.getSortOrderFlags`                                              |
|  4,773,727 |  2.6 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |
|  4,464,161 |  2.4 | `core.levenshteinWithMax`                                                |
|  2,902,724 |  1.6 | `checker.hashWrite32[checker.TypeId]`                                    |
|  2,584,859 |  1.4 | `core.levAdd`                                                            |
|  2,474,278 |  1.3 | `checker.compareTypeNames`                                               |
|  2,254,985 |  1.2 | `(*scanner.Scanner).Scan`                                                |
|  2,074,002 |  1.1 | `slices.partitionCmpFunc[*ast.Symbol]`                                   |
|  2,072,759 |  1.1 | `(*checker.Checker).addTypeToUnion`                                      |
|  1,819,426 |  1.0 | `slices.partialInsertionSortCmpFunc[*ast.Symbol]`                        |
|  1,651,726 |  0.9 | `(*checker.Checker).instantiateTypeWithAlias`                            |
|  1,640,908 |  0.9 | `(*checker.Type).AsLiteralType`                                          |
|  1,622,450 |  0.9 | `(*checker.Checker).newType`                                             |
|  1,587,696 |  0.9 | `(*binder.Binder).bind`                                                  |
|  1,482,917 |  0.8 | `(*checker.Checker).addTypesToUnion`                                     |
|  1,408,169 |  0.8 | `(*zeebo/xxh3.Hasher).Write`                                             |
|  1,379,364 |  0.7 | `slices.insertionSortCmpFunc[*ast.Symbol]`                               |
|  1,285,755 |  0.7 | `(*checker.Checker).instantiateSymbol`                                   |
|  1,240,841 |  0.7 | `(*checker.Checker).getApparentType`                                     |
|  1,240,045 |  0.7 | `(*checker.Checker).getPropagatingFlagsOfTypes`                          |
|  1,190,803 |  0.6 | `(*scanner.Scanner).scanASCIITable`                                      |
|  1,184,108 |  0.6 | `core.ComputeECMALineStartsSeq$1`                                        |
|  1,145,706 |  0.6 | `(*checker.TupleNormalizer).add`                                         |
|  1,124,548 |  0.6 | `(*binder.NameResolver).Resolve`                                         |
|  1,034,920 |  0.6 | `(*core.Arena[ast.Symbol]).New[ast.Symbol]`                              |
|    989,176 |  0.5 | `(*core.Arena[checker.ValueSymbolLinks]).New[checker.ValueSymbolLinks]`  |

### All inputs from the image, es5

328 checks: median 173,312 ops, p90 521,378, max 75,224,300, min 55,445, total 205,681,645; 5668 functions executed.

| phase                                |         ops |    % |
| ------------------------------------ | ----------: | ---: |
| check main.ts                        | 163,430,528 | 79.5 |
| parse                                |  16,100,352 |  7.8 |
| checker creation (globals merge)     |  10,942,720 |  5.3 |
| bind                                 |   6,000,512 |  2.9 |
| program setup (file loader)          |   4,249,472 |  2.1 |
| sort + print diagnostics             |   3,563,264 |  1.7 |
| harness glue (run, diagnostics loop) |   1,213,933 |  0.6 |
| other diagnostics                    |     180,864 |  0.1 |

| package              |         ops |    % |
| -------------------- | ----------: | ---: |
| checker              | 117,883,156 | 57.3 |
| core                 |  19,137,702 |  9.3 |
| ast                  |  15,906,372 |  7.7 |
| slices               |  14,151,054 |  6.9 |
| scanner              |   6,620,400 |  3.2 |
| binder               |   6,104,421 |  3.0 |
| parser               |   5,092,051 |  2.5 |
| strings              |   3,242,740 |  1.6 |
| zeebo/xxh3           |   2,685,949 |  1.3 |
| compiler             |   1,640,939 |  0.8 |
| tspath               |   1,634,654 |  0.8 |
| gointypes/softfloat  |   1,377,070 |  0.7 |
| internal/bytealg     |   1,216,350 |  0.6 |
| stringutil           |   1,210,670 |  0.6 |
| internal/strconv     |     967,233 |  0.5 |
| fmt                  |     962,032 |  0.5 |
| printer              |     953,626 |  0.5 |
| unicode              |     762,443 |  0.4 |
| internal/stringslite |     571,792 |  0.3 |
| diagnostics          |     491,600 |  0.2 |

|        ops |   % | function                                                                 |
| ---------: | --: | ------------------------------------------------------------------------ |
| 19,536,470 | 9.5 | `checker.CompareTypes`                                                   |
| 11,153,162 | 5.4 | `(*checker.ArrayTypeMapper).Map`                                         |
| 10,685,181 | 5.2 | `(*checker.Checker).compareSymbolsWorker`                                |
|  7,663,458 | 3.7 | `checker.getTypeNameSymbol`                                              |
|  5,141,640 | 2.5 | `checker.getSortOrderFlags`                                              |
|  4,811,857 | 2.3 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |
|  4,366,041 | 2.1 | `core.levenshteinWithMax`                                                |
|  3,030,522 | 1.5 | `checker.hashWrite32[checker.TypeId]`                                    |
|  2,912,540 | 1.4 | `ast.GetSourceFileOfNode`                                                |
|  2,614,210 | 1.3 | `slices.partitionCmpFunc[*ast.Symbol]`                                   |
|  2,503,794 | 1.2 | `core.levAdd`                                                            |
|  2,484,948 | 1.2 | `checker.compareTypeNames`                                               |
|  2,255,019 | 1.1 | `(*scanner.Scanner).Scan`                                                |
|  2,107,971 | 1.0 | `(*checker.Checker).addTypeToUnion`                                      |
|  1,929,945 | 0.9 | `slices.insertionSortCmpFunc[*ast.Symbol]`                               |
|  1,863,086 | 0.9 | `(*checker.Checker).instantiateSymbol`                                   |
|  1,783,029 | 0.9 | `(*checker.Checker).instantiateTypeWithAlias`                            |
|  1,694,350 | 0.8 | `(*checker.Checker).newType`                                             |
|  1,658,512 | 0.8 | `(*checker.Type).AsLiteralType`                                          |
|  1,587,696 | 0.8 | `(*binder.Binder).bind`                                                  |
|  1,544,502 | 0.8 | `slices.partialInsertionSortCmpFunc[*ast.Symbol]`                        |
|  1,533,304 | 0.7 | `(*checker.Checker).getApparentType`                                     |
|  1,519,589 | 0.7 | `(*checker.Checker).addTypesToUnion`                                     |
|  1,490,888 | 0.7 | `(*zeebo/xxh3.Hasher).Write`                                             |
|  1,453,549 | 0.7 | `(*binder.NameResolver).Resolve`                                         |
|  1,391,358 | 0.7 | `(*checker.Checker).getNamedMembers`                                     |
|  1,269,519 | 0.6 | `(*core.Arena[checker.ValueSymbolLinks]).New[checker.ValueSymbolLinks]`  |
|  1,266,023 | 0.6 | `(*core.Arena[ast.Symbol]).New[ast.Symbol]`                              |
|  1,254,794 | 0.6 | `(*checker.Checker).getPropagatingFlagsOfTypes`                          |
|  1,190,925 | 0.6 | `(*scanner.Scanner).scanASCIITable`                                      |

### Inputs from the image without extreme/, mini

324 checks: median 154,204 ops, p90 403,303, max 1,379,449, min 47,661, total 69,141,457; 5581 functions executed.

| phase                                |        ops |    % |
| ------------------------------------ | ---------: | ---: |
| check main.ts                        | 31,236,864 | 45.2 |
| parse                                | 14,815,232 | 21.4 |
| checker creation (globals merge)     |  8,358,912 | 12.1 |
| bind                                 |  5,466,624 |  7.9 |
| program setup (file loader)          |  4,210,304 |  6.1 |
| sort + print diagnostics             |  3,758,336 |  5.4 |
| harness glue (run, diagnostics loop) |  1,117,265 |  1.6 |
| other diagnostics                    |    177,920 |  0.3 |

| package              |        ops |    % |
| -------------------- | ---------: | ---: |
| checker              | 22,021,252 | 31.8 |
| ast                  | 10,123,209 | 14.6 |
| scanner              |  6,114,838 |  8.8 |
| core                 |  5,546,285 |  8.0 |
| binder               |  5,106,239 |  7.4 |
| parser               |  4,625,662 |  6.7 |
| tspath               |  1,652,090 |  2.4 |
| compiler             |  1,625,276 |  2.4 |
| slices               |  1,621,345 |  2.3 |
| strings              |  1,317,986 |  1.9 |
| gointypes/softfloat  |  1,241,765 |  1.8 |
| stringutil           |  1,104,484 |  1.6 |
| fmt                  |  1,042,836 |  1.5 |
| printer              |    816,192 |  1.2 |
| zeebo/xxh3           |    582,338 |  0.8 |
| internal/stringslite |    537,512 |  0.8 |
| diagnostics          |    512,196 |  0.7 |
| unicode/utf8         |    350,306 |  0.5 |
| sync                 |    326,960 |  0.5 |
| collections          |    326,546 |  0.5 |

|       ops |   % | function                                                                 |
| --------: | --: | ------------------------------------------------------------------------ |
| 2,003,007 | 2.9 | `(*scanner.Scanner).Scan`                                                |
| 1,393,508 | 2.0 | `(*binder.Binder).bind`                                                  |
| 1,148,329 | 1.7 | `(*scanner.Scanner).scanASCIITable`                                      |
| 1,077,473 | 1.6 | `core.ComputeECMALineStartsSeq$1`                                        |
| 1,070,895 | 1.5 | `(*binder.NameResolver).Resolve`                                         |
|   830,512 | 1.2 | `(*checker.Checker).getApparentType`                                     |
|   805,362 | 1.2 | `(*scanner.Scanner).char`                                                |
|   779,400 | 1.1 | `(*checker.Checker).newType`                                             |
|   671,708 | 1.0 | `stringutil.ContainsNonASCII`                                            |
|   665,230 | 1.0 | `(*binder.Binder).bindChildren`                                          |
|   627,726 | 0.9 | `scanner.iterateCommentRanges$1`                                         |
|   581,113 | 0.8 | `(*checker.Checker).checkSourceElementWorker`                            |
|   548,209 | 0.8 | `gointypes/softfloat.fpack64`                                            |
|   530,487 | 0.8 | `checker.CompareTypes`                                                   |
|   484,731 | 0.7 | `binder.GetContainerFlags`                                               |
|   469,172 | 0.7 | `checker.hashWrite32[checker.TypeId]`                                    |
|   450,489 | 0.7 | `diagnostics.Format`                                                     |
|   411,558 | 0.6 | `(*checker.Checker).addTypeToUnion`                                      |
|   397,057 | 0.6 | `core.levenshteinWithMax`                                                |
|   395,372 | 0.6 | `(*checker.Checker).isSimpleTypeRelatedTo`                               |
|   390,745 | 0.6 | `ast.GetSourceFileOfNode`                                                |
|   376,665 | 0.5 | `(*checker.Checker).getConditionalFlowTypeOfType`                        |
|   329,107 | 0.5 | `unicode/utf8.DecodeRuneInString`                                        |
|   311,345 | 0.5 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |
|   302,442 | 0.4 | `checker.hashWrite64[int]`                                               |
|   299,462 | 0.4 | `stringutil.IsLineBreak`                                                 |
|   292,551 | 0.4 | `core.levAdd`                                                            |
|   292,454 | 0.4 | `(*checker.Checker).addTypesToUnion`                                     |
|   290,633 | 0.4 | `(*scanner.Scanner).scanIdentifier`                                      |
|   289,008 | 0.4 | `checker.NewChecker`                                                     |

### Inputs from the image without extreme/, es5

324 checks: median 167,981 ops, p90 495,757, max 1,671,199, min 55,445, total 81,801,423; 5652 functions executed.

| phase                                |        ops |    % |
| ------------------------------------ | ---------: | ---: |
| check main.ts                        | 41,714,048 | 51.0 |
| parse                                | 14,812,032 | 18.1 |
| checker creation (globals merge)     | 10,803,968 | 13.2 |
| bind                                 |  5,465,472 |  6.7 |
| program setup (file loader)          |  4,197,632 |  5.1 |
| sort + print diagnostics             |  3,425,664 |  4.2 |
| harness glue (run, diagnostics loop) |  1,204,047 |  1.5 |
| other diagnostics                    |    178,560 |  0.2 |

| package              |        ops |    % |
| -------------------- | ---------: | ---: |
| checker              | 30,364,666 | 37.1 |
| ast                  | 13,013,586 | 15.9 |
| core                 |  6,475,323 |  7.9 |
| scanner              |  6,097,770 |  7.5 |
| binder               |  5,620,826 |  6.9 |
| parser               |  4,625,662 |  5.7 |
| slices               |  2,187,830 |  2.7 |
| compiler             |  1,620,939 |  2.0 |
| tspath               |  1,614,454 |  2.0 |
| strings              |  1,298,610 |  1.6 |
| stringutil           |  1,105,840 |  1.4 |
| fmt                  |    949,023 |  1.2 |
| printer              |    887,299 |  1.1 |
| zeebo/xxh3           |    780,195 |  1.0 |
| gointypes/softfloat  |    569,235 |  0.7 |
| internal/stringslite |    541,504 |  0.7 |
| diagnostics          |    485,275 |  0.6 |
| collections          |    353,720 |  0.4 |
| unicode/utf8         |    349,636 |  0.4 |
| sync                 |    318,527 |  0.4 |

|       ops |   % | function                                                                 |
| --------: | --: | ------------------------------------------------------------------------ |
| 2,003,041 | 2.4 | `(*scanner.Scanner).Scan`                                                |
| 1,397,404 | 1.7 | `(*binder.NameResolver).Resolve`                                         |
| 1,393,508 | 1.7 | `(*binder.Binder).bind`                                                  |
| 1,350,770 | 1.7 | `ast.GetSourceFileOfNode`                                                |
| 1,148,451 | 1.4 | `(*scanner.Scanner).scanASCIITable`                                      |
| 1,057,874 | 1.3 | `(*checker.Checker).getApparentType`                                     |
| 1,008,458 | 1.2 | `core.ComputeECMALineStartsSeq$1`                                        |
|   849,825 | 1.0 | `(*checker.Checker).newType`                                             |
|   805,407 | 1.0 | `(*scanner.Scanner).char`                                                |
|   671,708 | 0.8 | `stringutil.ContainsNonASCII`                                            |
|   665,230 | 0.8 | `(*binder.Binder).bindChildren`                                          |
|   627,726 | 0.8 | `scanner.iterateCommentRanges$1`                                         |
|   616,688 | 0.8 | `(*checker.Checker).mergeGlobalSymbol`                                   |
|   594,286 | 0.7 | `checker.hashWrite32[checker.TypeId]`                                    |
|   587,704 | 0.7 | `checker.CompareTypes`                                                   |
|   581,223 | 0.7 | `(*checker.Checker).checkSourceElementWorker`                            |
|   567,693 | 0.7 | `(*checker.Checker).compareSymbolsWorker`                                |
|   551,280 | 0.7 | `(*checker.Checker).initializeChecker`                                   |
|   497,508 | 0.6 | `(*checker.Checker).getMergedSymbol`                                     |
|   490,886 | 0.6 | `(*checker.Checker).getConditionalFlowTypeOfType`                        |
|   484,731 | 0.6 | `binder.GetContainerFlags`                                               |
|   443,867 | 0.5 | `(*checker.Checker).getNamedMembers`                                     |
|   442,675 | 0.5 | `(*checker.Checker).addTypeToUnion`                                      |
|   440,440 | 0.5 | `(*checker.Checker).isSimpleTypeRelatedTo`                               |
|   427,961 | 0.5 | `diagnostics.Format`                                                     |
|   393,508 | 0.5 | `(*checker.Checker).isDeclarationContainedBy`                            |
|   384,066 | 0.5 | `checker.hashWrite64[int]`                                               |
|   365,546 | 0.4 | `(*checker.Checker).instantiateSymbol`                                   |
|   364,700 | 0.4 | `(*zeebo/xxh3.Hasher).Write`                                             |
|   342,492 | 0.4 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |

### Events (instruction kinds): all inputs from the image, the es5 one-liner, stage 0

| event                                       |  mini, all |   es5, all |   es5 core | es5 one-liner | stage 0 es5 warm |
| ------------------------------------------- | ---------: | ---------: | ---------: | ------------: | ---------------: |
| binop                                       | 41,925,422 | 45,204,901 | 16,204,383 |        15,584 |           40,535 |
| load + unop (stage 0: UnOp)                 | 24,586,944 | 27,510,786 |  9,754,294 |         9,978 |           14,803 |
| if                                          | 30,413,051 | 33,436,048 | 13,919,827 |        13,333 |           33,860 |
| phi                                         |  8,737,939 |  9,679,970 |  3,935,868 |         4,530 |           21,047 |
| jump                                        |  4,013,877 |  4,617,783 |  2,177,531 |         2,552 |           10,612 |
| return                                      | 12,444,642 | 14,050,329 |  6,481,876 |         7,373 |           10,050 |
| fieldAddr                                   | 24,037,164 | 26,970,737 | 11,688,916 |        12,450 |           17,733 |
| store                                       |  5,756,205 |  6,245,365 |  2,957,159 |         4,186 |            5,472 |
| index / indexAddr                           |  6,623,818 |  7,107,219 |  1,849,870 |         2,134 |            7,781 |
| extract                                     |  2,244,327 |  2,471,492 |    889,254 |         1,278 |            1,647 |
| slice                                       |  1,090,248 |  1,176,532 |    567,707 |           731 |            1,506 |
| convert / changeType                        |  2,915,870 |  3,079,819 |    878,110 |           999 |            1,178 |
| call static (IR functions)                  | 10,916,551 | 12,377,578 |  5,849,588 |         6,533 |                  |
| call static (intrinsic)                     |    566,230 |    561,017 |     71,942 |           190 |                  |
| call static, all (stage 0: incl. externals) | 11,482,781 | 12,938,595 |  5,921,530 |         6,723 |            9,500 |
| call interface method                       |    401,944 |    463,414 |    348,245 |           468 |              476 |
| call func value / closure                   |  1,100,138 |  1,183,483 |    258,533 |           293 |              390 |
| call builtin len                            |  3,367,147 |  3,713,905 |  1,480,232 |         2,088 |            7,483 |
| call builtin append                         |    558,839 |    603,735 |    191,008 |           313 |              890 |
| call builtin cap                            |    226,470 |    256,545 |    133,532 |           159 |              382 |
| alloc heap                                  |  1,056,498 |  1,126,087 |    565,987 |         1,097 |            1,532 |
| alloc local                                 |    576,045 |    714,821 |    294,903 |           335 |              434 |
| makeInterface                               |    145,962 |    151,972 |    102,275 |           204 |              261 |
| makeClosure                                 |    149,847 |    156,084 |    117,495 |           271 |              276 |
| makeSlice / makeMap                         |     77,285 |     81,377 |     74,326 |           154 |              156 |
| typeAssert                                  |  1,000,453 |  1,111,347 |    289,576 |           321 |              475 |
| map lookup                                  |    580,238 |    701,501 |    304,888 |           449 |              566 |
| map update                                  |    213,504 |    282,257 |    123,035 |           213 |              349 |
| map range / next                            |    103,306 |    187,853 |     99,943 |           241 |              239 |
| string index                                |          0 |          0 |          0 |             0 |                  |
| defer / runDefers                           |     68,664 |     68,660 |     66,950 |           187 |              188 |

### Intrinsics (1 op each on the reference; a loop over their bytes at the type level)

| intrinsic                                   | mini calls | mini bytes | es5 calls | es5 bytes |
| ------------------------------------------- | ---------: | ---------: | --------: | --------: |
| `internal/bytealg.abigen_runtime_cmpstring` |    479,257 |  2,710,646 |   474,306 | 2,703,192 |
| `internal/bytealg.IndexByteString`          |     16,378 |  1,699,651 |    16,317 | 1,698,549 |
| `internal/bytealg.CountString`              |     17,958 |    238,490 |    17,540 |   227,793 |
| `internal/bytealg.IndexString`              |     13,450 |    207,031 |    13,450 |   204,407 |
| `gointypes/rt.Write`                        |        328 |     64,115 |       328 |    60,587 |
| `slices.overlaps`                           |      1,232 |      4,455 |     1,476 |     6,174 |
| `internal/abi.NoEscape`                     |     16,170 |          0 |    16,034 |         0 |
| `sync/atomic.LoadUint32`                    |      9,756 |          0 |     9,756 |         0 |
| `sync/atomic.StoreUint32`                   |      3,876 |          0 |     3,876 |         0 |
| `internal/bytealg.MakeNoZero`               |      3,801 |          0 |     3,683 |         0 |
| `sync/atomic.LoadUint64`                    |      1,268 |          0 |     1,437 |         0 |
| `sync/atomic.AddInt32`                      |        656 |          0 |       656 |         0 |
| `sync/atomic.LoadInt32`                     |        656 |          0 |       656 |         0 |
| `sync/atomic.AddUint64`                     |        516 |          0 |       538 |         0 |
| `sync/atomic.CompareAndSwapUint64`          |        516 |          0 |       538 |         0 |
| `sync/atomic.AddUint32`                     |        328 |          0 |       328 |         0 |
| `maps.clone`                                |         84 |          0 |        98 |         0 |

### Largest checks from the image

| input                                          |       mini |        es5 |
| ---------------------------------------------- | ---------: | ---------: |
| extreme/deep-recursion.ts                      | 69,359,527 | 75,224,300 |
| extreme/template-cross-product.ts              | 41,639,044 | 41,657,917 |
| extreme/large-unions.ts                        |  4,737,449 |  4,760,091 |
| extreme/add-20-22.ts                           |  1,411,882 |  2,237,914 |
| upstream/identicalTypesNoDifferByCheckOrder.ts |  1,070,189 |  1,671,199 |
| upstream/intersectionsAndOptionalProperties.ts |    515,631 |  1,611,718 |
| upstream/genericTypeParameterEquivalence2.ts   |  1,213,240 |  1,467,461 |
| upstream/returnTypeTypeArguments.ts            |  1,379,449 |  1,387,199 |
| upstream/intersectionApparentTypeCaching.ts    |    144,110 |  1,232,821 |
| upstream/vueLikeDataAndPropsInference2.ts      |    892,713 |  1,170,862 |
| clean-type-level.ts                            |    692,915 |  1,145,040 |
| upstream/vardecl.ts                            |  1,089,609 |  1,108,992 |

<!-- generated by scripts/profile.ts: end -->
