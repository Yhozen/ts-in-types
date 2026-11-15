// microsoft/TypeScript tests/cases/compiler/rectype.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
namespace M {
    interface I { (i:I):I; }

    export function f(p: I) { return f };

    var i:I;

    f(i);
    f(f(i));
    f((f(f(i))));
}

