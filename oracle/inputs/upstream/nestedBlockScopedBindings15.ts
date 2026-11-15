// microsoft/TypeScript tests/cases/compiler/nestedBlockScopedBindings15.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
for (; false;) {
  {
    let x;
    () => x;
  }
}

for (; false;) {
  {
    let y;
    y = 1;
  }
}

for (; false;) {
  switch (1) {
    case 1:
      let z0;
      () => z0;
      break;
  }
}

for (; false;) {
  switch (1) {
    case 1:
      let z;
      z = 1;
      break;
  }
}
