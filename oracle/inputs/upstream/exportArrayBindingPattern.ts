// microsoft/TypeScript tests/cases/compiler/exportArrayBindingPattern.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @module: commonjs
// issue: https://github.com/Microsoft/TypeScript/issues/10778
const [a, , b] = [1, 2, 3];
export { a, b };