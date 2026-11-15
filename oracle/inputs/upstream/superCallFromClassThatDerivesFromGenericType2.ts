// microsoft/TypeScript tests/cases/compiler/superCallFromClassThatDerivesFromGenericType2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
declare class B<T> {
    m<U>(): B<U>;
}

class D extends B<any> {
    constructor() {
        super();
    }
}
