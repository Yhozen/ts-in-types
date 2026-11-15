// microsoft/TypeScript tests/cases/compiler/generics5.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
interface A { a: string; }
interface B extends A { b: string; }

interface C extends B { c: string; }
interface G<T, U extends B> {


}

var v3: G<A, A>;               // Error, A not valid argument for U

