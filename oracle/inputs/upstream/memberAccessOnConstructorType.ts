// microsoft/TypeScript tests/cases/compiler/memberAccessOnConstructorType.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
var f: new () => void;
f.arguments == 0;
