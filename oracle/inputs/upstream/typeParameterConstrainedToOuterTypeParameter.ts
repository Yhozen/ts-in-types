// microsoft/TypeScript tests/cases/compiler/typeParameterConstrainedToOuterTypeParameter.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
interface A<T> {
  <U extends T>(x: U[]);
}

interface B<T> {
  <U extends T>(x: U);
}

declare var a: A<string>;
var b: B<string> = a; // assignment should be legal (both U's get instantiated to any for comparison)
