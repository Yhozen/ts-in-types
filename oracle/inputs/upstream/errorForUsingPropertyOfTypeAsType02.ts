// microsoft/TypeScript tests/cases/compiler/errorForUsingPropertyOfTypeAsType02.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
namespace Test1 {
  function foo<T extends { abc: number }>(x: T) {
    let a: T.abc = x.abc;
  }
}
