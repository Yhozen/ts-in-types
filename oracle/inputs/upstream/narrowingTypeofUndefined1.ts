// microsoft/TypeScript tests/cases/compiler/narrowingTypeofUndefined1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
declare const a:
  | { error: { prop: string }; result: undefined }
  | { error: undefined; result: { prop: number } };

if (typeof a.error === "undefined") {
  a.result.prop; // number
} else {
  a.error.prop; // string
}

if (typeof a.error !== "undefined") {
  a.error.prop; // string
} else {
  a.result.prop; // number
}
