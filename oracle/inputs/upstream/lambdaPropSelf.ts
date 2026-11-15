// microsoft/TypeScript tests/cases/compiler/lambdaPropSelf.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
declare var ko: any;

class Person {
  children: string[];

  constructor(
    public name: string,
    children: string[],
  ) {
    this.children = ko.observableArray(children);
  }

  addChild = () => this.children.push("New child");
}

class T {
  fo() {
    var x = this;
  }
}

namespace M {
  var x = this;
}
