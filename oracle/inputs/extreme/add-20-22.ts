// Type-level addition through tuple lengths, with a deliberate error: the
// message shows the computed sum.
type Tuple<N extends number, T extends unknown[] = []> = T["length"] extends N ? T : Tuple<N, [...T, unknown]>;
type Add<A extends number, B extends number> = [...Tuple<A>, ...Tuple<B>]["length"];
const sum: Add<20, 22> = "forty-two";
