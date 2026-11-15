// microsoft/TypeScript tests/cases/compiler/discriminantUsingEvaluatableTemplateExpression.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true
// @noEmit: true

// repro from https://github.com/microsoft/TypeScript/issues/53888

type S = { d: "s"; cb: (x: string) => void };
type N = { d: "n"; cb: (x: number) => void };

declare function foo(foo: S | N): void;

foo({
  d: `${"s"}`,
  cb: (x) => {
    x; // string
  },
});
