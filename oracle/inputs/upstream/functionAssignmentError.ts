// microsoft/TypeScript tests/cases/compiler/functionAssignmentError.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
var func = function (){return "ONE";};
func = function (){return "ONE";};