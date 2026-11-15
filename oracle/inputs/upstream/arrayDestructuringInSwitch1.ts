// microsoft/TypeScript tests/cases/compiler/arrayDestructuringInSwitch1.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
export type Expression = BooleanLogicExpression | "true" | "false";
export type BooleanLogicExpression = ["and", ...Expression[]] | ["not", Expression];

export function evaluate(expression: Expression): boolean {
  if (Array.isArray(expression)) {
    const [operator, ...operands] = expression;
    switch (operator) {
      case "and": {
        return operands.every((child) => evaluate(child));
      }
      case "not": {
        return !evaluate(operands[0]);
      }
      default: {
        throw new Error(`${operator} is not a supported operator`);
      }
    }
  } else {
    return expression === "true";
  }
}
