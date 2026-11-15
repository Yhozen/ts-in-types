// microsoft/TypeScript tests/cases/compiler/functionOverloads43.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
function foo(bar: { a: number }[]): number;
function foo(bar: { a: string }[]): string;
function foo([x]: { a: number | string }[]): string | number {
  if (x) {
    return x.a;
  }

  return undefined;
}

var x = foo([{ a: "str" }]);
var y = foo([{ a: 100 }]);
