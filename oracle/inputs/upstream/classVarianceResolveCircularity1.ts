// microsoft/TypeScript tests/cases/compiler/classVarianceResolveCircularity1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true

// Issue #52813

class Bar<T> {
    num!: number;
    Value = callme(this).num;
    Field: number = callme(this).num;
}
declare function callme(x: Bar<any>): Bar<any>;
declare function callme(x: object): string;