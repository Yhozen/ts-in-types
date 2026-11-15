// microsoft/TypeScript tests/cases/compiler/implicitAnyAmbients.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @noimplicitany: true

declare namespace m {
    var x; // error
    var y: any;

    function f(x); // error 
    function f2(x: any); // error
    function f3(x: any): any;

    interface I {
        foo(); // error
        foo2(x: any); // error
        foo3(x: any): any;
    }

    class C {
        foo(); // error
        foo2(x: any); // error
        foo3(x: any): any;
    }

    namespace n {
        var y; // error
    }

    import m2 = n;
}