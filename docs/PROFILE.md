# Profile: TypeScript 7 on the reference interpreter

Where a check's operations go when the real compiler (tsgo v7.0.2, Go)
runs on go-in-types' reference interpreter, from the boot image
(`scripts/boot.ts`), over the 328 oracle inputs in both lib modes. One op
is one executed IR instruction (go-in-types `docs/DESIGN.md`); an
intrinsic call is 1 op. Regenerate the tables with
`node scripts/boot.ts && node scripts/profile.ts` (data:
`oracle/profile.json`); the prose here is hand-written.

## Headline

- **The one-liner from the image: 96,689 ops (mini), 116,638 (es5)**, vs
  1.35M / 21.9M fresh (package init is 1.00M of both). The image keeps the
  parsed command line, so the 77k ops of option parsing (40% of stage 0's
  warm check, almost all `strings.ToLower`) are gone; that target is done.
- **Median check from the image: 202k ops (mini), 226k (es5)**; p90
  ~620–670k; max 245M (`extreme/template-cross-product.ts`). The four
  `extreme/` inputs are 75% of all ops; without them the 324 es5 checks
  total 118M.
- **Per check, the fixed cost is checker creation**: merging the lib's
  globals into a new checker is 46.6k ops (es5) / 38k (mini), 40% of the
  one-liner, more than parsing, binding and checking `main.ts` together
  (36k).
- **Top targets for the type-level run** (ops are the reference's; the
  type level pays per op and, for intrinsics, per byte):
  1. **Soft float, 14% of non-extreme es5 ops (46% of all)**:
     `math.IsNaN`/`IsInf`/`Min` on `jsnum.Number` and
     `core.levenshteinWithMax` (spelling suggestions: "Did you mean ...?")
     call `gointypes/softfloat` (`funpack64`/`fpack64`/`fcmp64`).
     `IsNaN`/`IsInf`/`Min` are bit tests on the float's pattern: a `math`
     overlay (`Float64bits` is an identity conversion) removes most of it
     without changing results. Levenshtein needs exact float sums of 0.1
     and 2: keep soft float there, or a fast path for that pattern.
  2. **xxh3, 8.5% of non-extreme ops, 11% of the one-liner** (12.9k):
     the checker's cache keys hashed by the pure-Go overlay of
     `zeebo/xxh3` (`Hasher.step` alone 9.5k). A hash primitive in the
     type-level runtime, or a cheaper hash in the overlay if no output
     depends on hash values (to verify), is the biggest single function.
  3. **The harness's in-memory FS, ~8k of the one-liner**:
     `vfstest.FromMapWithClock` is rebuilt per check (path normalisation,
     `io/fs.ValidPath`, `testing/fstest`), and every lookup goes through
     `tspath.hasRelativePathSegment` (6.3k, the second function) and
     `unicode/utf8.ValidString`. Building the FS once in the image (only
     `main.ts` changes) or a flat map FS as in stage 0 removes most of it.
  4. **String intrinsics**: `bytealg.abigen_runtime_cmpstring` 476k calls
     over 2.7 MB (string comparisons),
     `IndexByteString` 25k calls over 1.8 MB, `CountString` 20k / 0.26 MB.
     1 op each here; at the type level they are loops over bytes, so their
     cost is per byte (see the intrinsics table).
  5. **Checker creation** (above): `mergeGlobalSymbol`,
     `initializeChecker`, `NewChecker`, `getMergedSymbol` run identically
     for every check; reusing the lib's merged globals across programs is
     a tsgo change (a checker per program), so it is a later option.
  6. Parsing `main.ts` (scanner + parser, 17% of non-extreme ops) and
     `ast.ForEachChild` walks are ordinary compiler work.
- Event mix (non-extreme es5): 7.2M static calls, 0.36M interface calls,
  0.33M func-value calls, 0.87M allocs (0.58M heap), 0.27M map lookups and
  0.12M updates, 0.30M type asserts per 118M ops.

## Reference vs stage 0's SSA counter (the one-liner)

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
| fresh: package init                      |     1,003,846 |      1,003,846 |
| fresh: check (options → print)           |       347,633 |     20,876,976 |
| **fresh total**                          | **1,351,479** | **21,880,822** |
| boot (init + boot entry, warm-up check)  |     1,351,670 |     21,881,013 |
| **from the image (checkWarm)**           |    **96,689** |    **116,638** |
| stage 0 SSA, warm (options parsed again) |       161,615 |        190,063 |

Phases (sampled every 128 ops on the innermost recognised frame):

| phase                                | mini fresh | mini image |  es5 fresh | es5 image |
| ------------------------------------ | ---------: | ---------: | ---------: | --------: |
| package init                         |  1,003,776 |          0 |  1,003,776 |         0 |
| options (ParseCommandLine)           |     77,312 |          0 |     77,184 |         0 |
| harness: in-memory FS                |      2,176 |      2,176 |      2,176 |     2,048 |
| parse                                |    145,920 |      9,472 | 16,991,744 |     9,472 |
| bind                                 |     38,912 |      3,712 |  3,702,656 |     3,712 |
| checker creation (globals merge)     |     37,888 |     38,016 |     46,720 |    46,592 |
| check main.ts                        |     11,904 |     11,904 |     23,168 |    23,168 |
| sort + print diagnostics             |      4,864 |      4,864 |      4,736 |     4,864 |
| program setup (file loader)          |     25,472 |     23,680 |     25,088 |    23,552 |
| other diagnostics                    |        512 |        512 |        640 |       768 |
| harness glue (run, diagnostics loop) |      2,743 |      2,353 |      2,934 |     2,462 |

### The es5 one-liner from the image vs stage 0's warm check, by package

| package                                | reference (image) | stage 0 (warm) | difference |
| -------------------------------------- | ----------------: | -------------: | ---------: |
| strings                                |             3,160 |         71,992 |    -68,832 |
| zeebo/xxh3                             |            12,855 |              0 |    +12,855 |
| internal/bytealg                       |             1,279 |          8,401 |     -7,122 |
| ast                                    |            12,470 |         17,046 |     -4,576 |
| tsoptions                              |               508 |          4,144 |     -3,636 |
| collections                            |               731 |          3,793 |     -3,062 |
| checker                                |            34,199 |         36,839 |     -2,640 |
| tspath                                 |            10,944 |          8,621 |     +2,323 |
| regexp                                 |                 0 |          2,301 |     -2,301 |
| io/fs                                  |             1,646 |              0 |     +1,646 |
| slices                                 |             4,392 |          5,811 |     -1,419 |
| vfs/vfstest                            |             1,225 |              0 |     +1,225 |
| unicode/utf8                           |             1,206 |            164 |     +1,042 |
| testing/fstest                         |               942 |              0 |       +942 |
| core                                   |             6,513 |          7,222 |       -709 |
| internal/sync                          |                 0 |            627 |       -627 |
| diagnostics                            |               676 |            136 |       +540 |
| time                                   |               462 |              0 |       +462 |
| vfs/internal                           |               324 |              0 |       +324 |
| microsoft/typescript-go/cmd/tsgo       |               302 |              0 |       +302 |
| bytes                                  |               239 |              0 |       +239 |
| microsoft/typescript-go/cmd/opsharness |                 0 |            224 |       -224 |
| execute/tsc                            |               287 |             75 |       +212 |
| fmt                                    |             1,465 |          1,625 |       -160 |
| internal/stringslite                   |             1,424 |          1,272 |       +152 |
| **total**                              |       **116,638** |    **190,063** |    -73,425 |

Stage 0's top functions (warm es5 check) on the reference, es5 one-liner from the image:

| stage 0 | reference | function                                                              |
| ------: | --------: | --------------------------------------------------------------------- |
|  55,642 |        62 | `strings.ToLower`                                                     |
|   5,791 |       473 | `(*strings.Builder).copyCheck`                                        |
|   5,634 |         0 | `internal/bytealg.CountString`                                        |
|   5,115 |     1,515 | `ast.GetSourceFileOfNode`                                             |
|   4,270 |     6,258 | `tspath.hasRelativePathSegment`                                       |
|   2,990 |         0 | `(*collections.OrderedMap[string, *tsoptions.CommandLineOption]).Set` |
|   2,640 |       256 | `(*strings.Builder).WriteString`                                      |
|   2,324 |       644 | `(*checker.Checker).compareSymbolsWorker`                             |
|   2,255 |        55 | `(*strings.Builder).WriteByte`                                        |
|   2,175 |     2,175 | `(*checker.Checker).newType`                                          |
|   2,063 |     2,063 | `(*ast.Node).ForEachChild`                                            |
|   1,872 |     1,872 | `(*checker.Checker).mergeGlobalSymbol`                                |
|   1,856 |       160 | `(*strings.Builder).grow`                                             |
|   1,825 |         0 | `tsoptions.GetNameMapFromList`                                        |
|   1,740 |       150 | `(*strings.Builder).Grow`                                             |
|   1,678 |     1,678 | `(*checker.Checker).initializeChecker`                                |
|   1,647 |         0 | `internal/bytealg.IndexByteString`                                    |
|   1,310 |     1,310 | `checker.CompareTypes`                                                |
|   1,235 |     1,235 | `(*scanner.Scanner).Scan`                                             |
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
|     882 |     1,241 | `internal/bytealg.LastIndexByteString`                                |

Top functions, es5 one-liner from the image:

|   ops |   % | function                                                                 |
| ----: | --: | ------------------------------------------------------------------------ |
| 9,528 | 8.2 | `(*zeebo/xxh3.Hasher).step`                                              |
| 6,258 | 5.4 | `tspath.hasRelativePathSegment`                                          |
| 2,728 | 2.3 | `(*zeebo/xxh3.Hasher).Write`                                             |
| 2,175 | 1.9 | `(*checker.Checker).newType`                                             |
| 2,063 | 1.8 | `(*ast.Node).ForEachChild`                                               |
| 1,872 | 1.6 | `(*checker.Checker).mergeGlobalSymbol`                                   |
| 1,678 | 1.4 | `(*checker.Checker).initializeChecker`                                   |
| 1,515 | 1.3 | `ast.GetSourceFileOfNode`                                                |
| 1,428 | 1.2 | `io/fs.ValidPath`                                                        |
| 1,310 | 1.1 | `checker.CompareTypes`                                                   |
| 1,241 | 1.1 | `internal/bytealg.LastIndexByteString`                                   |
| 1,235 | 1.1 | `(*scanner.Scanner).Scan`                                                |
| 1,164 | 1.0 | `(*binder.NameResolver).Resolve`                                         |
| 1,126 | 1.0 | `(*checker.Checker).getMergedSymbol`                                     |
| 1,053 | 0.9 | `(*checker.Checker).addTypeToUnion`                                      |
|   952 | 0.8 | `(*binder.Binder).bind`                                                  |
|   924 | 0.8 | `unicode/utf8.ValidString`                                               |
|   892 | 0.8 | `checker.NewChecker`                                                     |
|   882 | 0.8 | `(*checker.Checker).isDeclarationContainedBy`                            |
|   782 | 0.7 | `(*checker.Checker).getNamedMembers`                                     |
|   775 | 0.7 | `tspath.GetEncodedRootLength`                                            |
|   758 | 0.6 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |
|   756 | 0.6 | `(core.TextRange).ContainedBy`                                           |
|   748 | 0.6 | `checker.hashWrite32[checker.TypeId]`                                    |
|   737 | 0.6 | `(*checker.Checker).addTypesToUnion`                                     |

### All inputs from the image, mini

328 checks: median 202,295 ops, p90 641,376, max 244,757,603, min 72,522, total 455,382,476; 5554 functions executed.

| phase                                |         ops |    % |
| ------------------------------------ | ----------: | ---: |
| check main.ts                        | 401,176,320 | 88.1 |
| parse                                |  21,525,120 |  4.7 |
| checker creation (globals merge)     |  12,011,264 |  2.6 |
| program setup (file loader)          |   7,784,448 |  1.7 |
| bind                                 |   6,829,952 |  1.5 |
| sort + print diagnostics             |   3,902,464 |  0.9 |
| harness glue (run, diagnostics loop) |   1,259,596 |  0.3 |
| harness: in-memory FS                |     713,728 |  0.2 |
| other diagnostics                    |     179,584 |  0.0 |

| package             |         ops |    % |
| ------------------- | ----------: | ---: |
| gointypes/softfloat | 222,645,598 | 48.9 |
| checker             | 106,308,784 | 23.3 |
| zeebo/xxh3          |  31,454,553 |  6.9 |
| ast                 |  16,893,014 |  3.7 |
| core                |  14,273,599 |  3.1 |
| slices              |  12,991,367 |  2.9 |
| math                |  11,125,074 |  2.4 |
| scanner             |   7,719,047 |  1.7 |
| binder              |   5,585,804 |  1.2 |
| parser              |   5,092,051 |  1.1 |
| tspath              |   3,833,214 |  0.8 |
| strings             |   3,325,319 |  0.7 |
| compiler            |   1,645,276 |  0.4 |
| internal/bytealg    |   1,385,332 |  0.3 |
| stringutil          |   1,209,314 |  0.3 |
| unicode             |   1,124,123 |  0.2 |
| fmt                 |   1,055,845 |  0.2 |
| internal/strconv    |     967,090 |  0.2 |
| printer             |     882,519 |  0.2 |
| unicode/utf8        |     732,329 |  0.2 |

|        ops |    % | function                                                                 |
| ---------: | ---: | ------------------------------------------------------------------------ |
| 62,287,103 | 13.7 | `gointypes/softfloat.fpack64`                                            |
| 56,587,353 | 12.4 | `gointypes/softfloat.funpack64`                                          |
| 45,953,007 | 10.1 | `gointypes/softfloat.fcmp64`                                             |
| 22,961,363 |  5.0 | `(*zeebo/xxh3.Hasher).step`                                              |
| 20,652,954 |  4.5 | `gointypes/softfloat.f64toint`                                           |
| 19,450,015 |  4.3 | `checker.CompareTypes`                                                   |
| 16,485,429 |  3.6 | `gointypes/softfloat.fadd64`                                             |
| 11,119,989 |  2.4 | `(*checker.ArrayTypeMapper).Map`                                         |
|  9,252,688 |  2.0 | `(*checker.Checker).compareSymbolsWorker`                                |
|  7,627,766 |  1.7 | `checker.getTypeNameSymbol`                                              |
|  7,020,000 |  1.5 | `(*zeebo/xxh3.Hasher).Write`                                             |
|  6,210,546 |  1.4 | `gointypes/softfloat.feq64`                                              |
|  5,873,785 |  1.3 | `gointypes/softfloat.fgt64`                                              |
|  5,213,710 |  1.1 | `(*ast.Node).ForEachChild`                                               |
|  5,146,910 |  1.1 | `core.levenshteinWithMax`                                                |
|  5,107,764 |  1.1 | `checker.getSortOrderFlags`                                              |
|  4,773,727 |  1.0 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |
|  4,102,587 |  0.9 | `math.IsInf`                                                             |
|  2,902,724 |  0.6 | `checker.hashWrite32[checker.TypeId]`                                    |
|  2,841,829 |  0.6 | `(*scanner.Scanner).Scan`                                                |
|  2,739,213 |  0.6 | `math.min`                                                               |
|  2,474,278 |  0.5 | `checker.compareTypeNames`                                               |
|  2,083,784 |  0.5 | `tspath.hasRelativePathSegment`                                          |
|  2,074,002 |  0.5 | `slices.partitionCmpFunc[*ast.Symbol]`                                   |
|  2,072,759 |  0.5 | `(*checker.Checker).addTypeToUnion`                                      |
|  1,819,426 |  0.4 | `slices.partialInsertionSortCmpFunc[*ast.Symbol]`                        |
|  1,651,726 |  0.4 | `(*checker.Checker).instantiateTypeWithAlias`                            |
|  1,640,908 |  0.4 | `(*checker.Type).AsLiteralType`                                          |
|  1,622,450 |  0.4 | `(*checker.Checker).newType`                                             |
|  1,587,696 |  0.3 | `(*binder.Binder).bind`                                                  |

### All inputs from the image, es5

328 checks: median 225,852 ops, p90 667,428, max 244,777,552, min 81,086, total 472,394,661; 5628 functions executed.

| phase                                |         ops |    % |
| ------------------------------------ | ----------: | ---: |
| check main.ts                        | 415,719,040 | 88.0 |
| parse                                |  21,519,232 |  4.6 |
| checker creation (globals merge)     |  14,783,360 |  3.1 |
| program setup (file loader)          |   7,723,648 |  1.6 |
| bind                                 |   6,832,256 |  1.4 |
| sort + print diagnostics             |   3,559,936 |  0.8 |
| harness glue (run, diagnostics loop) |   1,407,909 |  0.3 |
| harness: in-memory FS                |     671,744 |  0.1 |
| other diagnostics                    |     177,536 |  0.0 |

| package             |         ops |    % |
| ------------------- | ----------: | ---: |
| gointypes/softfloat | 217,330,754 | 46.0 |
| checker             | 117,883,156 | 25.0 |
| zeebo/xxh3          |  33,690,618 |  7.1 |
| ast                 |  22,286,834 |  4.7 |
| core                |  16,109,108 |  3.4 |
| slices              |  14,224,198 |  3.0 |
| math                |  10,832,992 |  2.3 |
| scanner             |   7,702,109 |  1.6 |
| binder              |   6,104,421 |  1.3 |
| parser              |   5,092,051 |  1.1 |
| tspath              |   3,764,358 |  0.8 |
| strings             |   3,294,892 |  0.7 |
| compiler            |   1,640,939 |  0.3 |
| internal/bytealg    |   1,359,686 |  0.3 |
| stringutil          |   1,210,670 |  0.3 |
| unicode             |   1,097,827 |  0.2 |
| internal/strconv    |     967,233 |  0.2 |
| fmt                 |     962,032 |  0.2 |
| printer             |     953,626 |  0.2 |
| unicode/utf8        |     724,443 |  0.2 |

|        ops |    % | function                                                                 |
| ---------: | ---: | ------------------------------------------------------------------------ |
| 60,987,485 | 12.9 | `gointypes/softfloat.fpack64`                                            |
| 55,107,614 | 11.7 | `gointypes/softfloat.funpack64`                                          |
| 44,739,219 |  9.5 | `gointypes/softfloat.fcmp64`                                             |
| 24,561,135 |  5.2 | `(*zeebo/xxh3.Hasher).step`                                              |
| 20,280,300 |  4.3 | `gointypes/softfloat.f64toint`                                           |
| 19,536,470 |  4.1 | `checker.CompareTypes`                                                   |
| 16,066,095 |  3.4 | `gointypes/softfloat.fadd64`                                             |
| 11,153,162 |  2.4 | `(*checker.ArrayTypeMapper).Map`                                         |
| 10,685,181 |  2.3 | `(*checker.Checker).compareSymbolsWorker`                                |
|  7,663,458 |  1.6 | `checker.getTypeNameSymbol`                                              |
|  7,484,392 |  1.6 | `(*zeebo/xxh3.Hasher).Write`                                             |
|  6,048,643 |  1.3 | `gointypes/softfloat.feq64`                                              |
|  5,718,139 |  1.2 | `gointypes/softfloat.fgt64`                                              |
|  5,467,048 |  1.2 | `(*ast.Node).ForEachChild`                                               |
|  5,141,640 |  1.1 | `checker.getSortOrderFlags`                                              |
|  5,032,185 |  1.1 | `core.levenshteinWithMax`                                                |
|  4,811,857 |  1.0 | `slices.BinarySearchFunc[[]*checker.Type, *checker.Type, *checker.Type]` |
|  3,990,890 |  0.8 | `math.IsInf`                                                             |
|  3,030,522 |  0.6 | `checker.hashWrite32[checker.TypeId]`                                    |
|  2,912,540 |  0.6 | `ast.GetSourceFileOfNode`                                                |
|  2,841,954 |  0.6 | `(*scanner.Scanner).Scan`                                                |
|  2,663,310 |  0.6 | `math.min`                                                               |
|  2,614,210 |  0.6 | `slices.partitionCmpFunc[*ast.Symbol]`                                   |
|  2,484,948 |  0.5 | `checker.compareTypeNames`                                               |
|  2,107,971 |  0.4 | `(*checker.Checker).addTypeToUnion`                                      |
|  2,052,624 |  0.4 | `tspath.hasRelativePathSegment`                                          |
|  1,929,945 |  0.4 | `slices.insertionSortCmpFunc[*ast.Symbol]`                               |
|  1,863,086 |  0.4 | `(*checker.Checker).instantiateSymbol`                                   |
|  1,783,029 |  0.4 | `(*checker.Checker).instantiateTypeWithAlias`                            |
|  1,694,350 |  0.4 | `(*checker.Checker).newType`                                             |

### Inputs from the image without extreme/, mini

324 checks: median 200,454 ops, p90 618,890, max 5,051,257, min 72,522, total 107,934,833; 5541 functions executed.

| phase                                |        ops |    % |
| ------------------------------------ | ---------: | ---: |
| check main.ts                        | 56,605,056 | 52.4 |
| parse                                | 19,735,936 | 18.3 |
| checker creation (globals merge)     | 11,858,560 | 11.0 |
| program setup (file loader)          |  7,689,728 |  7.1 |
| bind                                 |  6,148,096 |  5.7 |
| sort + print diagnostics             |  3,765,504 |  3.5 |
| harness glue (run, diagnostics loop) |  1,249,649 |  1.2 |
| harness: in-memory FS                |    705,024 |  0.7 |
| other diagnostics                    |    177,280 |  0.2 |

| package              |        ops |    % |
| -------------------- | ---------: | ---: |
| checker              | 22,021,252 | 20.4 |
| gointypes/softfloat  | 21,681,971 | 20.1 |
| ast                  | 15,211,272 | 14.1 |
| zeebo/xxh3           |  7,819,475 |  7.2 |
| scanner              |  7,154,010 |  6.6 |
| core                 |  5,229,120 |  4.8 |
| binder               |  5,106,239 |  4.7 |
| parser               |  4,625,662 |  4.3 |
| tspath               |  3,786,602 |  3.5 |
| slices               |  1,693,597 |  1.6 |
| compiler             |  1,625,276 |  1.5 |
| strings              |  1,369,502 |  1.3 |
| math                 |  1,119,017 |  1.0 |
| stringutil           |  1,104,484 |  1.0 |
| fmt                  |  1,042,836 |  1.0 |
| printer              |    816,192 |  0.8 |
| unicode/utf8         |    720,962 |  0.7 |
| io/fs                |    539,119 |  0.5 |
| internal/stringslite |    536,216 |  0.5 |
| diagnostics          |    512,196 |  0.5 |

|       ops |   % | function                                      |
| --------: | --: | --------------------------------------------- |
| 5,902,623 | 5.5 | `gointypes/softfloat.funpack64`               |
| 5,719,205 | 5.3 | `(*zeebo/xxh3.Hasher).step`                   |
| 5,510,579 | 5.1 | `gointypes/softfloat.fpack64`                 |
| 4,897,197 | 4.5 | `gointypes/softfloat.fcmp64`                  |
| 4,573,403 | 4.2 | `(*ast.Node).ForEachChild`                    |
| 2,566,663 | 2.4 | `(*scanner.Scanner).Scan`                     |
| 2,058,372 | 1.9 | `tspath.hasRelativePathSegment`               |
| 1,663,672 | 1.5 | `(*zeebo/xxh3.Hasher).Write`                  |
| 1,653,210 | 1.5 | `gointypes/softfloat.f64toint`                |
| 1,576,319 | 1.5 | `gointypes/softfloat.fadd64`                  |
| 1,393,508 | 1.3 | `(*binder.Binder).bind`                       |
| 1,077,473 | 1.0 | `core.ComputeECMALineStartsSeq$1`             |
| 1,070,895 | 1.0 | `(*binder.NameResolver).Resolve`              |
| 1,067,637 | 1.0 | `(*scanner.Scanner).scanASCIIWhile`           |
|   830,512 | 0.8 | `(*checker.Checker).getApparentType`          |
|   805,362 | 0.7 | `(*scanner.Scanner).char`                     |
|   779,400 | 0.7 | `(*checker.Checker).newType`                  |
|   671,708 | 0.6 | `stringutil.ContainsNonASCII`                 |
|   665,230 | 0.6 | `(*binder.Binder).bindChildren`               |
|   663,295 | 0.6 | `gointypes/softfloat.feq64`                   |
|   627,726 | 0.6 | `scanner.iterateCommentRanges$1`              |
|   618,815 | 0.6 | `ast.isStatementKindButNotDeclarationKind`    |
|   603,765 | 0.6 | `gointypes/softfloat.fgt64`                   |
|   581,113 | 0.5 | `(*checker.Checker).checkSourceElementWorker` |
|   530,487 | 0.5 | `checker.CompareTypes`                        |
|   484,731 | 0.4 | `binder.GetContainerFlags`                    |
|   469,172 | 0.4 | `checker.hashWrite32[checker.TypeId]`         |
|   468,504 | 0.4 | `io/fs.ValidPath`                             |
|   461,171 | 0.4 | `core.levenshteinWithMax`                     |
|   450,489 | 0.4 | `diagnostics.Format`                          |

### Inputs from the image without extreme/, es5

324 checks: median 223,363 ops, p90 622,674, max 12,367,995, min 81,086, total 118,189,001; 5612 functions executed.

| phase                                |        ops |    % |
| ------------------------------------ | ---------: | ---: |
| check main.ts                        | 64,424,064 | 54.5 |
| parse                                | 19,730,304 | 16.7 |
| checker creation (globals merge)     | 14,595,968 | 12.3 |
| program setup (file loader)          |  7,629,568 |  6.5 |
| bind                                 |  6,150,528 |  5.2 |
| sort + print diagnostics             |  3,422,208 |  2.9 |
| harness glue (run, diagnostics loop) |  1,397,193 |  1.2 |
| harness: in-memory FS                |    663,552 |  0.6 |
| other diagnostics                    |    175,616 |  0.1 |

| package              |        ops |    % |
| -------------------- | ---------: | ---: |
| checker              | 30,364,666 | 25.7 |
| ast                  | 18,566,633 | 15.7 |
| gointypes/softfloat  | 16,367,127 | 13.8 |
| zeebo/xxh3           | 10,029,433 |  8.5 |
| scanner              |  7,137,084 |  6.0 |
| core                 |  6,251,509 |  5.3 |
| binder               |  5,620,826 |  4.8 |
| parser               |  4,625,662 |  3.9 |
| tspath               |  3,718,186 |  3.1 |
| slices               |  2,260,082 |  1.9 |
| compiler             |  1,620,939 |  1.4 |
| strings              |  1,350,126 |  1.1 |
| stringutil           |  1,105,840 |  0.9 |
| fmt                  |    949,023 |  0.8 |
| printer              |    887,299 |  0.8 |
| math                 |    826,935 |  0.7 |
| unicode/utf8         |    713,164 |  0.6 |
| internal/stringslite |    538,912 |  0.5 |
| io/fs                |    533,287 |  0.5 |
| diagnostics          |    485,275 |  0.4 |

|       ops |   % | function                                      |
| --------: | --: | --------------------------------------------- |
| 7,299,334 | 6.2 | `(*zeebo/xxh3.Hasher).step`                   |
| 4,826,741 | 4.1 | `(*ast.Node).ForEachChild`                    |
| 4,422,884 | 3.7 | `gointypes/softfloat.funpack64`               |
| 4,210,961 | 3.6 | `gointypes/softfloat.fpack64`                 |
| 3,683,409 | 3.1 | `gointypes/softfloat.fcmp64`                  |
| 2,566,788 | 2.2 | `(*scanner.Scanner).Scan`                     |
| 2,122,224 | 1.8 | `(*zeebo/xxh3.Hasher).Write`                  |
| 2,027,592 | 1.7 | `tspath.hasRelativePathSegment`               |
| 1,397,404 | 1.2 | `(*binder.NameResolver).Resolve`              |
| 1,393,508 | 1.2 | `(*binder.Binder).bind`                       |
| 1,350,770 | 1.1 | `ast.GetSourceFileOfNode`                     |
| 1,280,556 | 1.1 | `gointypes/softfloat.f64toint`                |
| 1,156,985 | 1.0 | `gointypes/softfloat.fadd64`                  |
| 1,067,750 | 0.9 | `(*scanner.Scanner).scanASCIIWhile`           |
| 1,057,874 | 0.9 | `(*checker.Checker).getApparentType`          |
| 1,008,458 | 0.9 | `core.ComputeECMALineStartsSeq$1`             |
|   849,825 | 0.7 | `(*checker.Checker).newType`                  |
|   805,407 | 0.7 | `(*scanner.Scanner).char`                     |
|   799,455 | 0.7 | `ast.isStatementKindButNotDeclarationKind`    |
|   671,708 | 0.6 | `stringutil.ContainsNonASCII`                 |
|   665,230 | 0.6 | `(*binder.Binder).bindChildren`               |
|   627,726 | 0.5 | `scanner.iterateCommentRanges$1`              |
|   616,688 | 0.5 | `(*checker.Checker).mergeGlobalSymbol`        |
|   594,286 | 0.5 | `checker.hashWrite32[checker.TypeId]`         |
|   587,704 | 0.5 | `checker.CompareTypes`                        |
|   581,223 | 0.5 | `(*checker.Checker).checkSourceElementWorker` |
|   567,693 | 0.5 | `(*checker.Checker).compareSymbolsWorker`     |
|   551,280 | 0.5 | `(*checker.Checker).initializeChecker`        |
|   501,392 | 0.4 | `gointypes/softfloat.feq64`                   |
|   497,508 | 0.4 | `(*checker.Checker).getMergedSymbol`          |

### Events (instruction kinds): all inputs from the image, the es5 one-liner, stage 0

| event                                       |   mini, all |    es5, all |   es5 core | es5 one-liner | stage 0 es5 warm |
| ------------------------------------------- | ----------: | ----------: | ---------: | ------------: | ---------------: |
| binop                                       | 138,334,275 | 140,776,138 | 29,306,736 |        23,702 |           40,535 |
| load + unop (stage 0: UnOp)                 |  29,555,502 |  32,772,757 | 11,167,472 |        12,085 |           14,803 |
| if                                          |  80,862,424 |  83,272,056 | 21,856,363 |        17,808 |           33,860 |
| phi                                         |  46,253,105 |  46,574,877 |  7,538,727 |         7,756 |           21,047 |
| jump                                        |  20,014,926 |  20,397,696 |  3,712,724 |         3,757 |           10,612 |
| return                                      |  26,036,890 |  27,387,936 |  7,877,502 |         8,129 |           10,050 |
| fieldAddr                                   |  30,278,026 |  33,693,787 | 13,883,902 |        15,540 |           17,733 |
| store                                       |   7,923,321 |   8,612,972 |  3,823,746 |         5,474 |            5,472 |
| index / indexAddr                           |   7,373,048 |   7,882,235 |  2,114,792 |         3,067 |            7,781 |
| extract                                     |  23,870,875 |  23,555,715 |  2,661,141 |         1,683 |            1,647 |
| slice                                       |   1,152,175 |   1,237,692 |    628,130 |           918 |            1,506 |
| convert / changeType                        |   9,326,635 |   9,444,400 |  1,591,354 |         1,617 |            1,178 |
| call static (IR functions)                  |  24,416,991 |  25,623,872 |  7,155,199 |         7,207 |                  |
| call static (intrinsic)                     |     570,166 |     564,953 |     75,830 |           202 |                  |
| call static, all (stage 0: incl. externals) |  24,987,157 |  26,188,825 |  7,231,029 |         7,409 |            9,500 |
| call interface method                       |     416,702 |     478,172 |    362,823 |           513 |              476 |
| call func value / closure                   |   1,172,924 |   1,255,774 |    329,758 |           317 |              390 |
| call builtin len                            |   3,600,671 |   3,957,540 |  1,660,466 |         2,571 |            7,483 |
| call builtin append                         |     359,171 |     392,490 |    140,634 |           259 |              890 |
| call builtin cap                            |     227,780 |     257,855 |    134,826 |           163 |              382 |
| alloc heap                                  |   1,071,525 |   1,141,331 |    581,054 |         1,144 |            1,532 |
| alloc local                                 |     323,829 |     469,794 |    290,104 |           381 |              434 |
| makeInterface                               |     155,474 |     161,484 |    111,671 |           233 |              261 |
| makeClosure                                 |     154,111 |     160,348 |    121,707 |           284 |              276 |
| makeSlice / makeMap                         |      79,811 |      83,953 |     76,874 |           162 |              156 |
| typeAssert                                  |   1,007,341 |   1,118,235 |    296,380 |           342 |              475 |
| map lookup                                  |     277,645 |     396,487 |    268,580 |           459 |              566 |
| map update                                  |     188,618 |     256,930 |    120,662 |           222 |              349 |
| map range / next                            |     118,394 |     202,941 |    114,847 |           287 |              239 |
| string index                                |           0 |           0 |          0 |             0 |                  |
| defer / runDefers                           |      77,848 |      77,844 |     76,022 |           215 |              188 |

### Intrinsics (1 op each on the reference; a loop over their bytes at the type level)

| intrinsic                                   | mini calls | mini bytes | es5 calls | es5 bytes |
| ------------------------------------------- | ---------: | ---------: | --------: | --------: |
| `internal/bytealg.abigen_runtime_cmpstring` |    481,225 |  2,731,638 |   476,274 | 2,723,200 |
| `internal/bytealg.IndexByteString`          |     25,234 |  1,784,931 |    25,173 | 1,780,877 |
| `internal/bytealg.CountString`              |     20,910 |    268,994 |    20,492 |   257,641 |
| `gointypes/rt.Write`                        |        328 |     64,115 |       328 |    60,587 |
| `internal/bytealg.IndexString`              |      3,610 |     52,871 |     3,610 |    52,215 |
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

| input                                          |        mini |         es5 |
| ---------------------------------------------- | ----------: | ----------: |
| extreme/template-cross-product.ts              | 244,757,603 | 244,777,552 |
| extreme/deep-recursion.ts                      |  87,038,303 |  92,916,412 |
| extreme/large-unions.ts                        |  13,559,396 |  13,583,634 |
| upstream/arguments.ts                          |   1,951,884 |  12,367,995 |
| extreme/add-20-22.ts                           |   2,092,341 |   2,928,062 |
| upstream/identicalTypesNoDifferByCheckOrder.ts |   3,872,114 |   2,200,470 |
| upstream/intersectionsAndOptionalProperties.ts |     823,634 |   2,144,077 |
| upstream/genericTypeParameterEquivalence2.ts   |   1,493,194 |   1,791,151 |
| error-cannot-find-name.ts                      |     660,771 |   1,754,319 |
| upstream/intersectionApparentTypeCaching.ts    |     199,161 |   1,681,126 |
| upstream/returnTypeTypeArguments.ts            |   1,572,932 |   1,581,467 |
| upstream/vueLikeDataAndPropsInference2.ts      |   5,051,257 |   1,541,828 |

<!-- generated by scripts/profile.ts: end -->
