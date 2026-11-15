// microsoft/TypeScript tests/cases/compiler/instanceofTypeAliasToGenericClass.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
declare class TableClass<S = any> {
  _field: S;
}

export type Table = TableClass;

function fn<T extends Table>(o: T) {
  return o instanceof TableClass;
}

function fn2<T extends TableClass>(o: T) {
  return o instanceof TableClass;
}

declare const o: Table;
o instanceof TableClass;
