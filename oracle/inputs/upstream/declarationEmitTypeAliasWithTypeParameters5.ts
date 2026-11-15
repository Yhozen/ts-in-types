// microsoft/TypeScript tests/cases/compiler/declarationEmitTypeAliasWithTypeParameters5.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @module: commonjs
// @target: es2015
// @declaration: true

type Foo<T, Y> = {
    foo<U, J>(): Foo<U, J>
};
export type SubFoo<R> = Foo<string, R>;

function foo() {
    return {} as SubFoo<number>;
}
