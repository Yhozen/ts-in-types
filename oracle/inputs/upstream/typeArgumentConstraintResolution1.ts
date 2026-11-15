// microsoft/TypeScript tests/cases/compiler/typeArgumentConstraintResolution1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
function foo1<T extends Date>(test: T);
function foo1<T extends Number>(test: string);
function foo1<T extends String>(test: any) { }
foo1<Date>(""); // should error



function foo2<T extends Date>(test: T): T;
function foo2<T extends Number>(test: string): T; 
function foo2<T extends String>(test: any): any { return null; }
foo2<Date>(""); // Type Date does not satisfy the constraint 'Number' for type parameter 'T extends Number'
