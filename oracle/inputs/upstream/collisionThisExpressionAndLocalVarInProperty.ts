// microsoft/TypeScript tests/cases/compiler/collisionThisExpressionAndLocalVarInProperty.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
class class1 {
    public prop1 = {
        doStuff: (callback) => () => {
            var _this = 2;
            return callback(this);
        }
    }
}

class class2 {
    constructor() {
        var _this = 2;
    }
    public prop1 = {
        doStuff: (callback) => () => {
            return callback(this);
        }
    }
}