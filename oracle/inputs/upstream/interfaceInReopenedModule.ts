// microsoft/TypeScript tests/cases/compiler/interfaceInReopenedModule.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
namespace m {
}

// In second instance of same module, exported interface is not visible
namespace m {
    interface f {}
    export class n { 
        private n: f;
    }
}
