// microsoft/TypeScript tests/cases/compiler/spreadObjectWithIndexDoesNotAddUndefinedToLocalIndex.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true
declare const m: { [k: string]: string };
const x: { [k: string]: string } = { ...m, ["a" + "b"]: "" };