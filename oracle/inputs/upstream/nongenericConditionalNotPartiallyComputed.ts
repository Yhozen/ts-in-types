// microsoft/TypeScript tests/cases/compiler/nongenericConditionalNotPartiallyComputed.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// Expected: type A = number
// Got: type A = number[] extends (infer T)[] ? T : never
type A =
  Array<number> extends Array<any> ? (Array<number> extends Array<infer T> ? T : never) : never;
