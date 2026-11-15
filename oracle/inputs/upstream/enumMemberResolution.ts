// microsoft/TypeScript tests/cases/compiler/enumMemberResolution.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
enum Position2 {
    IgnoreRulesSpecific = 0
}
var x = IgnoreRulesSpecific. // error
var y = 1;
var z = Position2.IgnoreRulesSpecific; // no error
