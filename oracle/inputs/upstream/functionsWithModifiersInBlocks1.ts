// microsoft/TypeScript tests/cases/compiler/functionsWithModifiersInBlocks1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
{
   declare function f() { }
   export function f() { }
   declare export function f() { }
}