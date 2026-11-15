interface Dict {
  [key: string]: number;
}
const d: Dict = { a: 1, b: "two" };
const v: number = d["zzz"];
interface Named {
  [key: string]: number;
  name: string;
}
