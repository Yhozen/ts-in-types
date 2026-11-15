// microsoft/TypeScript tests/cases/compiler/emitSkipsThisWithRestParameter.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
function rebase(fn: (base: any, ...args: any[]) => any): (...args: any[]) => any {
    return function(this: any, ...args: any[]) {
        return fn.apply(this, [ this ].concat(args));
    };
}
