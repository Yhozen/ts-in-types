// microsoft/TypeScript tests/cases/compiler/baseClassImprovedMismatchErrors.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class Base {
    n: Base | string;
    fn() {
        return 10;
    }
}
class Derived extends Base {
    n: Derived | string;
    fn() {
        return 10 as number | string;
    }
}
class DerivedInterface implements Base {
    n: DerivedInterface | string;
    fn() {
        return 10 as number | string;
    }
}