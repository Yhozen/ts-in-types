type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type G = Getters<{ name: string; age: number }>;
const g: G = { getName: () => "x", getAge: () => "y" };
