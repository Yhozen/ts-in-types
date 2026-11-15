// microsoft/TypeScript tests/cases/compiler/typeofUsedBeforeBlockScoped.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
type T = typeof C & typeof C.s & typeof o & typeof o.n;
class C {
  static s = 2;
}
type W = typeof o.n;
let o2: typeof o;
let o = { n: 12 };
