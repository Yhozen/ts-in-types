// microsoft/TypeScript tests/cases/compiler/voidAsOperator.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
if (!void 0 !== true) {
}

//CHECK#2
if (!null !== true) {
}
