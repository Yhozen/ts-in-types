// microsoft/TypeScript tests/cases/compiler/exportDefaultForNonInstantiatedModule.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: ES6

namespace m {
  export interface foo {}
}
// Should not be emitted
export default m;
