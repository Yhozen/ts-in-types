interface P { name: string; tags: string[]; nested: { deep: number } }
type N = P["name"];
type T = P["tags"][number];
type D = P["nested"]["deep"];
const d: D = "x";
type Bad = P["nope"];
