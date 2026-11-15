// microsoft/TypeScript tests/cases/compiler/instanceSubtypeCheck1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
interface A<T>
{
   x: A<B<T>>
}
 
interface B<T> extends A<T>
{
   x: B<A<T>>
}