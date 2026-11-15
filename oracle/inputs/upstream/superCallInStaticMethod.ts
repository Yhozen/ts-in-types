// microsoft/TypeScript tests/cases/compiler/superCallInStaticMethod.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class Doing {
  public static staticMethod() {}
}

class Other extends Doing {
  // in static method
  public static staticMethod() {
    super.staticMethod();
  }

  // in a lambda inside a static method
  public static lambdaInsideAStaticMethod() {
    () => {
      super.staticMethod();
    };
  }

  // in an object literal inside a static method
  public static objectLiteralInsideAStaticMethod() {
    return {
      a: () => {
        super.staticMethod();
      },
      b: super.staticMethod(),
    };
  }

  // in a getter
  public static get staticGetter() {
    super.staticMethod();

    return 0;
  }

  // in a setter
  public static set staticGetter(value: number) {
    super.staticMethod();
  }

  // in static method
  public static initializerInAStaticMethod(a = super.staticMethod()) {
    super.staticMethod();
  }
}
