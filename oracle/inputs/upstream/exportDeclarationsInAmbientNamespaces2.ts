// microsoft/TypeScript tests/cases/compiler/exportDeclarationsInAmbientNamespaces2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015

declare module "mod" {
    export var x: number;
}

declare namespace N {
    export { x } from "mod"; // Error
}

