// microsoft/TypeScript tests/cases/compiler/declarationEmitOptionalMethod.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @module: commonjs
// @target: es2015
// @declaration: true
// @strictNullChecks: true
export const Foo = (opts: {
  a?(): void;
  b?: () => void;
}): {
  c?(): void;
  d?: () => void;
} => ({});
