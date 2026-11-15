// microsoft/TypeScript tests/cases/compiler/conditionalEqualityTestingNullability.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true
export type Equals<A1 extends any, A2 extends any> =
    (<A>() => A extends A1 ? 1 : 0) extends (<A>() => A extends A2 ? 1 : 0)
    ? 1
    : 0

interface Foo<T> {
    x : () => T
}

declare const a: Foo<Date>;
declare const b: Foo<Date | null>;

//Expected 0, Actual 1
type ShouldBe0 = Equals<typeof a, typeof b>;