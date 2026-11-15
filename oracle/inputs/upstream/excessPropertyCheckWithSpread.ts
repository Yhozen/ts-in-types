// microsoft/TypeScript tests/cases/compiler/excessPropertyCheckWithSpread.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
declare function f({ a: number }): void
interface I {
    readonly n: number;
}
declare let i: I;
f({ a: 1, ...i });

interface R {
    opt?: number
}
interface L {
    opt: string
}
declare let l: L;
declare let r: R;
f({ a: 1, ...l, ...r });
