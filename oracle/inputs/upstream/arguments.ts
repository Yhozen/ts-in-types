// microsoft/TypeScript tests/cases/compiler/arguments.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: ES6
function f() {
  var x = arguments[12];
  (() => arguments)();
}

(() => arguments)();

interface I {
  method(args: typeof arguments): void;
  fn: (args: typeof arguments) => void;
  (args: typeof arguments): void;
  new (args: typeof arguments): void;
  construct: new (args: typeof arguments) => void;
}
