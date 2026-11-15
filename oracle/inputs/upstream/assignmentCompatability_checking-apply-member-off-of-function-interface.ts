// microsoft/TypeScript tests/cases/compiler/assignmentCompatability_checking-apply-member-off-of-function-interface.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
// 3.8.4 Assignment Compatibility 

interface Applicable {
    apply(blah: any); // also works for 'apply'
}

var x: Applicable;

// Should fail
x = '';
x = [''];
x = 4;
x = {};

// Should work
function f() { };
x = f;

function fn(c: Applicable) { }

// Should Fail
fn('');
fn(['']);
fn(4);
fn({});


// Should work
fn(a => { });
