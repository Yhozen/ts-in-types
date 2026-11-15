// microsoft/TypeScript tests/cases/compiler/defaultValueInFunctionTypes.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
type Foo = ({ first = 0 }: { first?: number }) => unknown;

var x: (a: number = 1) => number;
var y = <(a: string = "") => any>undefined;
