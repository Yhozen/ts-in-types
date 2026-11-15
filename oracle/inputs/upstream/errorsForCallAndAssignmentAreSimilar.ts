// microsoft/TypeScript tests/cases/compiler/errorsForCallAndAssignmentAreSimilar.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
function minimalExample1() {
    type Disc =
        | { kind: "hddvd" }
        | { kind: "bluray" }

    function foo(x: Disc[]) {
    }

    foo([
        { kind: "bluray", },
        { kind: "hdpvd", }
    ]);

    const ds: Disc[] = [
        { kind: "bluray", },
        { kind: "hdpvd", }
    ];
}