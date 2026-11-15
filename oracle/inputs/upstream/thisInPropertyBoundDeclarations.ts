// microsoft/TypeScript tests/cases/compiler/thisInPropertyBoundDeclarations.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class Bug {
  private name: string;

  private static func: Function[] = [
    (that: Bug, name: string) => {
      that.foo(name);
    },
  ];

  private foo(name: string) {
    this.name = name;
  }
}

// Valid use of this in a property bound decl
class A {
  prop1 = function () {
    this;
  };

  prop2 = function () {
    function inner() {
      this;
    }
    () => this;
  };

  prop3 = () => {
    function inner() {
      this;
    }
  };

  prop4 = {
    a: function () {
      return this;
    },
  };

  prop5 = () => {
    return {
      a: function () {
        return this;
      },
    };
  };
}

class B {
  prop1 = this;

  prop2 = () => this;

  prop3 = () => () => () => () => this;

  prop4 = "  " + function () {} + " " + (() => () => () => this);

  prop5 = {
    a: () => {
      return this;
    },
  };

  prop6 = () => {
    return {
      a: () => {
        return this;
      },
    };
  };
}
