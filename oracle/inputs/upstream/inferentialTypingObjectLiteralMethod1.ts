// microsoft/TypeScript tests/cases/compiler/inferentialTypingObjectLiteralMethod1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
interface Int<T, U> {
  method(x: T): U;
}
declare function foo<T, U>(x: T, y: Int<T, U>, z: Int<U, T>): T;
foo(
  "",
  {
    method(p1) {
      return p1.length;
    },
  },
  {
    method(p2) {
      return undefined;
    },
  },
);
