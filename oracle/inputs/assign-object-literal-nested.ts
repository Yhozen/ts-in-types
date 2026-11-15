interface Inner { v: number }
interface Outer { inner: Inner; list: Inner[] }
const o: Outer = { inner: { v: "1" }, list: [{ v: 1 }, { v: true }] };
