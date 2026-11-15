// microsoft/TypeScript tests/cases/compiler/indexerA.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class JQueryElement {
  id: string;
}

class JQuery {
  [n: number]: JQueryElement;
}

var jq: JQuery = { 0: { id: "a" }, 1: { id: "b" } };
jq[0].id;
