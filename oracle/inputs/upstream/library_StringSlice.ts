// microsoft/TypeScript tests/cases/compiler/library_StringSlice.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// String.prototype.slice can have zero, one, or two arguments
String.prototype.slice();
String.prototype.slice(0);
String.prototype.slice(0, 1);
