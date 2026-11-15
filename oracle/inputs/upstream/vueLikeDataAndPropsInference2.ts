// microsoft/TypeScript tests/cases/compiler/vueLikeDataAndPropsInference2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
interface Instance {
    _instanceBrand: never
}

type DataDef<Data, Props> = (this: Readonly<Props> & Instance) => Data

type PropsDefinition<T> = {
    [K in keyof T]: T[K]
}

interface Options<
    Data = object | ((this: Instance) => object),
    PropsDef = PropsDefinition<Record<string, any>>
    > {
    data?: Data
    props?: PropsDef
    watch?: Record<string, WatchHandler<any>>
}

type WatchHandler<T> = (val: T, oldVal: T) => void;

type ThisTypedOptions<Data, Props> =
    object &
    Options<DataDef<Data, Props>, PropsDefinition<Props>> &
    ThisType<Data & Readonly<Props> & Instance>

declare function test<Data, Props>(fn: ThisTypedOptions<Data, Props>): void;
declare function test(fn: Options): void;

test({
    props: {
        foo: ''
    },

    data(): { bar: boolean } {
        return {
            bar: true
        }
    },

    watch: {
        foo(newVal: string, oldVal: string): void {
            this.bar = false
        }
    }
})