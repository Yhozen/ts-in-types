type Colors = Record<"red" | "green", [number, number, number] | string>;
const p = { red: [255, 0, 0], green: "#0f0", blue: 1 } satisfies Colors;
const q = { red: "x" } satisfies Colors;
