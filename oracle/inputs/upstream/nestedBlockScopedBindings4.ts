// microsoft/TypeScript tests/cases/compiler/nestedBlockScopedBindings4.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
function a0() {
  for (let x; x < 1;) {
    x = x + 1;
  }
  for (let x; ;) {
    x = x + 2;
  }
}

function a1() {
  for (let x; x < 1;) {
    x = x + 1;
    () => x;
  }
  for (let x; ;) {
    x = x + 2;
  }
}

function a2() {
  for (let x; x < 1;) {
    x = x + 1;
  }
  for (let x; ;) {
    x = x + 2;
    () => x;
  }
}

function a3() {
  for (let x; x < 1;) {
    x = x + 1;
    () => x;
  }
  for (let x; ;) {
    x = x + 2;
    () => x;
  }
}
