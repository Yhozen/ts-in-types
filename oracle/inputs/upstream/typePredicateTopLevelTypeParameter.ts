// microsoft/TypeScript tests/cases/compiler/typePredicateTopLevelTypeParameter.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: true

// Repro from #51980

function getPermissions(user: string) {
  if (user === "Jack") return "admin";
  return undefined;
}

const admins = ["Mike", "Joe"].map((e) => getPermissions(e));

function isDefined<T>(a: T | undefined): a is T {
  return a !== undefined;
}

const foundAdmins = admins.filter(isDefined); // "admin"[]
