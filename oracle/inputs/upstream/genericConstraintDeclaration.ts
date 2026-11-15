// microsoft/TypeScript tests/cases/compiler/genericConstraintDeclaration.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @declaration:true
class List<T extends {}>{
    static empty<T extends {}>(): List<T>{return null;}
}




