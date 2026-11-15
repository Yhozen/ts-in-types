// microsoft/TypeScript tests/cases/compiler/contextualTyping19.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
var foo:{id:number;}[] = [{id:1}]; foo = [{id:1}, {id:2}];