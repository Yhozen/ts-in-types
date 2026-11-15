// microsoft/TypeScript tests/cases/compiler/contextualTypeSelfReferencing.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true
// @noEmit: true

// repro from https://github.com/microsoft/TypeScript/issues/54048

type narrow<def> = def extends string
  ? def
  : def extends [unknown, ...unknown[]]
  ? def
  : {
      [k in keyof def]: narrow<def[k]>;
    };

declare const parse: <def>(def: narrow<def>) => def;

const result = parse([{ a: "foo" }]);