// microsoft/TypeScript tests/cases/compiler/narrowByClauseExpressionInSwitchTrue2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true
// @noEmit: true

// https://github.com/microsoft/TypeScript/issues/55986

declare const f: 'a' | 'b' | 'c';

switch(true) {
    case f === 'a':
    case f === 'b':
        f;
        break
    default:
        f;
}

f;

switch(true) {
    case f === 'a':
        f;
    case f === 'b':
        f;
        break
    default:
        f;
}

f;
