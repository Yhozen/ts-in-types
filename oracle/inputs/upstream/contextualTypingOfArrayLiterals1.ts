// microsoft/TypeScript tests/cases/compiler/contextualTypingOfArrayLiterals1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
interface I {
   [x: number]: Date;
}

var x3: I = [new Date(), 1]; 
var r2 = x3[1]; 
r2.getDate(); 
