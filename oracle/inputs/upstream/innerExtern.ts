// microsoft/TypeScript tests/cases/compiler/innerExtern.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
namespace A {
  export declare namespace BB {
    export var Elephant;
  }
  export namespace B {
    export class C {
      x = BB.Elephant.X;
    }
  }
}
