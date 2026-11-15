// microsoft/TypeScript tests/cases/compiler/scopeCheckExtendedClassInsideStaticMethod1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
class C {
  private v;
  public p;
  static s;
}
class D extends C {
  static c() {
    v = 1;
    this.p = 1;
    s = 1;
  }
}
