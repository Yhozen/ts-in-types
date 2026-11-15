// microsoft/TypeScript tests/cases/compiler/genericClasses1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @declaration: true
class C<T> {
  public x: T;
}

var v1 = new C<string>();

var y = v1.x; // should be 'string'
