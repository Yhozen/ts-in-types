// microsoft/TypeScript tests/cases/compiler/genericFunctions2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @declaration: true
declare function map <T, U > (items: T[], f: (x: T) => U): U[];

var myItems: string[];
var lengths = map(myItems, x => x.length);

