// microsoft/TypeScript tests/cases/compiler/moduleCodeGenTest5.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
//@module: commonjs
export var x = 0;
var y = 0;

export function f1() {}
function f2() {}

export class C1 {
	public p1 = 0;
	public p2() {}
}
class C2{
	public p1 = 0;
	public p2() {}	
}

export enum E1 {A=0}
var u = E1.A;
enum E2 {B=0}
var v = E2.B;

