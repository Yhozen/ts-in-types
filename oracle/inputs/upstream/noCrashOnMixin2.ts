// microsoft/TypeScript tests/cases/compiler/noCrashOnMixin2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true
// @noEmit: true

// https://github.com/microsoft/TypeScript/issues/62921

class Abstract {
    protected constructor() {
    }
}

class Concrete extends Abstract {
}

type Constructor<T = {}> = new (...args?: any[]) => T;

function Mixin<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
    };
}

class Empty {
}

class CrashTrigger extends Mixin(Empty) {
    public trigger() {
        new Concrete();
    }
}
