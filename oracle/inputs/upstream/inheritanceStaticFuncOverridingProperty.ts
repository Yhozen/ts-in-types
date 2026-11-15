// microsoft/TypeScript tests/cases/compiler/inheritanceStaticFuncOverridingProperty.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
class a {
  static x: string;
}

class b extends a {
  static x() {
    return "20";
  }
}
