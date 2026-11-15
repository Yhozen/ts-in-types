// microsoft/TypeScript tests/cases/compiler/classExpressionAssignment.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
interface A {
  prop: string;
}

// This is invalid
const A: {new(): A} = class {}
