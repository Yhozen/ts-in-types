// microsoft/TypeScript tests/cases/compiler/unusedMultipleParameters2InFunctionDeclaration.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
//@noUnusedLocals:true
//@noUnusedParameters:true

function greeter(person: string, person2: string, person3: string) {
    var unused = 20;
    person2 = "dummy value";
}