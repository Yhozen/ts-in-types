// microsoft/TypeScript tests/cases/compiler/classExtendsMultipleBaseClasses.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class A { }
class B { }
class C extends A,B { }