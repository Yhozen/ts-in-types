// microsoft/TypeScript tests/cases/compiler/declarationEmitNameConflictsWithAlias.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @declaration: true
// @module: commonjs
export namespace C { export interface I { } }
export import v = C;
export namespace M {
    export namespace C { export interface I { } }
    export var w: v.I; // Gets emitted as C.I, which is the wrong interface
}