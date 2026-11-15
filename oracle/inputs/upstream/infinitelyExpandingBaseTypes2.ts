// microsoft/TypeScript tests/cases/compiler/infinitelyExpandingBaseTypes2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
interface A<T>
{
   x : A<()=>T>
}
 
interface B<T>
{
   x : B<()=>T>
}
 
var a: A<string>
var b: B<string> = a
