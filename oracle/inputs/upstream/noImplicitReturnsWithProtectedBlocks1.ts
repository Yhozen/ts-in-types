// microsoft/TypeScript tests/cases/compiler/noImplicitReturnsWithProtectedBlocks1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @noImplicitReturns: true
declare function log(s: string): void;
declare function get(): number;

function main1(): number {
  try {
    return get();
  } finally {
    log("in finally");
  }
}
