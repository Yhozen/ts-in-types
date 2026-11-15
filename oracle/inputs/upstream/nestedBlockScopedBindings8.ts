// microsoft/TypeScript tests/cases/compiler/nestedBlockScopedBindings8.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
var x;
for (let x; false;) {
  () => x;
}

var y;
for (let y; false;) {
  y = 1;
}
