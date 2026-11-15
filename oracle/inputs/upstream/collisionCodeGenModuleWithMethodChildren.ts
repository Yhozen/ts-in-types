// microsoft/TypeScript tests/cases/compiler/collisionCodeGenModuleWithMethodChildren.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
namespace M {
    export var x = 3;
    class c {
        fn(M, p = x) { }
    }
}

namespace M {
    class d {
        fn2() {
            var M;
            var p = x;
        }
    }
}

namespace M {
    class e {
        fn3() {
            function M() {
                var p = x;
            }
        }
    }
}

namespace M { // Shouldnt bn _M
    class f {
        M() {
        }
    }
}