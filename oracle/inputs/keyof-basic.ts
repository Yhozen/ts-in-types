interface P {
  name: string;
  age: number;
}
type K = keyof P;
const k: K = "nmae";
