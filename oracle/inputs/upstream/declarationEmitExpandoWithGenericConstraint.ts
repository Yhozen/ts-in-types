// microsoft/TypeScript tests/cases/compiler/declarationEmitExpandoWithGenericConstraint.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @module: commonjs
// @target: es2015
// @declaration: true
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect<p extends Point> {
  readonly a: p;
  readonly b: p;
}

export const Point = (x: number, y: number): Point => ({ x, y });
export const Rect = <p extends Point>(a: p, b: p): Rect<p> => ({ a, b });

Point.zero = (): Point => Point(0, 0);
