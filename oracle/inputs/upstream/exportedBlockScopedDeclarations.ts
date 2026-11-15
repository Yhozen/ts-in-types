// microsoft/TypeScript tests/cases/compiler/exportedBlockScopedDeclarations.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
// @module: esnext
const foo = foo; // compile error
export const bar = bar; // should be compile error
function f() {
  const bar = bar; // compile error
}
namespace NS {
  export const bar = bar; // should be compile error
}

let foo1 = foo1; // compile error
export let bar1 = bar1; // should be compile error
function f1() {
  let bar1 = bar1; // compile error
}
namespace NS1 {
  export let bar1 = bar1; // should be compile error
}