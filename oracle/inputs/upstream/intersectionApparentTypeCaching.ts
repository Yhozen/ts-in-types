// microsoft/TypeScript tests/cases/compiler/intersectionApparentTypeCaching.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true
// @noEmit: true

// https://github.com/microsoft/TypeScript/issues/58175

type TX<T extends any[] & object> = T["length"];
type T0<U extends any[] & object> = U;
type T1 = T0<string[]>;
