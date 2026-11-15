// microsoft/TypeScript tests/cases/compiler/anyAndUnknownHaveFalsyComponents.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strictNullChecks: true

declare let x1: any;
const y1 = x1 && 3;

// #39113
declare let isTreeHeader1: any;
function foo1() {
  return {
    display: "block",
    ...(isTreeHeader1 && {
      display: "flex",
    })
  };
}

declare let x2: unknown;
const y2 = x2 && 3;

// #39113
declare let isTreeHeader2: unknown;
function foo2() {
  return {
    display: "block",
    ...(isTreeHeader1 && {
      display: "flex",
    })
  };
}
