// microsoft/TypeScript tests/cases/compiler/fixTypeParameterInSignatureWithRestParameters.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
function bar<T>(item1: T, item2: T) { }
bar(1, ""); // Should be ok