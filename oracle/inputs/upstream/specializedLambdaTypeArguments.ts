// microsoft/TypeScript tests/cases/compiler/specializedLambdaTypeArguments.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class X<A> {
	prop: X< <Tany>() => Tany >;
}
var a: X<boolean>;
 
