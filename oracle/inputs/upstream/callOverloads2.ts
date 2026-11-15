// microsoft/TypeScript tests/cases/compiler/callOverloads2.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false


class Foo { // error
    bar1() { /*WScript.Echo("bar1");*/ }

    constructor(x: any) {
        // WScript.Echo("Constructor function has executed");
    }
}

function Foo(); // error

function F1(s:string) {return s;} // error
function F1(a:any) { return a;} // error

function Goo(s:string); // error - no implementation

declare function Gar(s:String); // expect no error

var f1 = new Foo("hey");


f1.bar1();
Foo();
