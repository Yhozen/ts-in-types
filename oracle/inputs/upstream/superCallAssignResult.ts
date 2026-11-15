// microsoft/TypeScript tests/cases/compiler/superCallAssignResult.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class E {
  constructor(arg: any) {}
}

class H extends E {
  constructor() {
    var x = super(5); // Should be of type void, not E.
    x = 5;
  }
}
