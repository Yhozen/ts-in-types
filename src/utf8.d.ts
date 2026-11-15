// UTF-8 at the type level. A TypeScript string literal type holds UTF-16
// text (tsrs splits template literal types by code point), while a Go string
// is bytes: the compiler reads main.ts as UTF-8 and prints UTF-8. Byte
// strings here are string literal types of characters U+0000..U+00FF.
//
// ASCII passes through unchanged (one lookup in a 128-key interface per
// character); anything else goes through the tables of image/utf8.gen.d.ts
// (scripts/gen-utf8.ts; BMP and plane 1, other code points become U+FFFD),
// which the checker only loads when a non-ASCII character appears.
//
// A declaration file: under skipLibCheck the checker never checks these
// generic declarations against the big tables (6.7 s as a .ts file).
//
// Both loops are tail-recursive with a fuel string: 900 steps per inner
// loop (under the checker's 1,000 tail-call limit), then an outer loop
// starts the next 900, so any length works.
import type { DecA, DecB, EncA, EncB, Lead } from "../image/utf8.gen.d.ts";

/** The 128 ASCII characters. */
interface Ascii {
  "\x00": 0;
  "\x01": 0;
  "\x02": 0;
  "\x03": 0;
  "\x04": 0;
  "\x05": 0;
  "\x06": 0;
  "\x07": 0;
  "\x08": 0;
  "\x09": 0;
  "\x0a": 0;
  "\x0b": 0;
  "\x0c": 0;
  "\x0d": 0;
  "\x0e": 0;
  "\x0f": 0;
  "\x10": 0;
  "\x11": 0;
  "\x12": 0;
  "\x13": 0;
  "\x14": 0;
  "\x15": 0;
  "\x16": 0;
  "\x17": 0;
  "\x18": 0;
  "\x19": 0;
  "\x1a": 0;
  "\x1b": 0;
  "\x1c": 0;
  "\x1d": 0;
  "\x1e": 0;
  "\x1f": 0;
  " ": 0;
  "!": 0;
  '"': 0;
  "#": 0;
  $: 0;
  "%": 0;
  "&": 0;
  "'": 0;
  "(": 0;
  ")": 0;
  "*": 0;
  "+": 0;
  ",": 0;
  "-": 0;
  ".": 0;
  "/": 0;
  "0": 0;
  "1": 0;
  "2": 0;
  "3": 0;
  "4": 0;
  "5": 0;
  "6": 0;
  "7": 0;
  "8": 0;
  "9": 0;
  ":": 0;
  ";": 0;
  "<": 0;
  "=": 0;
  ">": 0;
  "?": 0;
  "@": 0;
  A: 0;
  B: 0;
  C: 0;
  D: 0;
  E: 0;
  F: 0;
  G: 0;
  H: 0;
  I: 0;
  J: 0;
  K: 0;
  L: 0;
  M: 0;
  N: 0;
  O: 0;
  P: 0;
  Q: 0;
  R: 0;
  S: 0;
  T: 0;
  U: 0;
  V: 0;
  W: 0;
  X: 0;
  Y: 0;
  Z: 0;
  "[": 0;
  "\\": 0;
  "]": 0;
  "^": 0;
  _: 0;
  "`": 0;
  a: 0;
  b: 0;
  c: 0;
  d: 0;
  e: 0;
  f: 0;
  g: 0;
  h: 0;
  i: 0;
  j: 0;
  k: 0;
  l: 0;
  m: 0;
  n: 0;
  o: 0;
  p: 0;
  q: 0;
  r: 0;
  s: 0;
  t: 0;
  u: 0;
  v: 0;
  w: 0;
  x: 0;
  y: 0;
  z: 0;
  "{": 0;
  "|": 0;
  "}": 0;
  "~": 0;
  "\x7f": 0;
}

type X100 =
  "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
type F900 = `${X100}${X100}${X100}${X100}${X100}${X100}${X100}${X100}${X100}`;

/** One character's UTF-8 bytes. */
type Enc1<C extends string> = C extends keyof Ascii
  ? C
  : C extends keyof EncB
    ? EncB[C]
    : C extends keyof EncA
      ? EncA[C]
      : "\xef\xbf\xbd";

/**
 * Up to 900 steps; ["more", rest, acc] when out of fuel. The ASCII fast
 * path takes four characters at a time; otherwise one is encoded (bound by
 * `infer`, so the alias never forms a template of four big unions).
 */
type EncI<S extends string, Acc extends string, F extends string> = F extends `x${infer F2}`
  ? S extends `${infer a}${infer b}${infer c}${infer d}${infer R}`
    ? [a | b | c | d] extends [keyof Ascii]
      ? EncI<R, `${Acc}${a}${b}${c}${d}`, F2>
      : Enc1<a> extends infer e extends string
        ? EncI<`${b}${c}${d}${R}`, `${Acc}${e}`, F2>
        : never
    : S extends `${infer a}${infer R}`
      ? Enc1<a> extends infer e extends string
        ? EncI<R, `${Acc}${e}`, F2>
        : never
      : Acc
  : ["more", S, Acc];
type EncO<R> = R extends ["more", infer S extends string, infer Acc extends string]
  ? EncO<EncI<S, Acc, F900>>
  : R;

/** The UTF-8 bytes of S, as a byte string (S itself when it is ASCII). */
export type Utf8<S extends string> = EncO<EncI<S, "", F900>> & string;

/** Up to 900 characters decoded; ["more", rest, acc] when out of fuel. */
type DecI<S extends string, Acc extends string, F extends string> = F extends `x${infer F2}`
  ? S extends `${infer a}${infer R}`
    ? a extends keyof Ascii
      ? DecI<R, `${Acc}${a}`, F2>
      : DecMb<a, R, Acc, F2, a extends keyof Lead ? Lead[a] : "0">
    : Acc
  : ["more", S, Acc];
/** A multi-byte sequence starting with lead byte A, N continuation bytes. */
type DecMb<
  A extends string,
  R extends string,
  Acc extends string,
  F extends string,
  N,
> = N extends "1"
  ? R extends `${infer b}${infer R2}`
    ? DecI<R2, `${Acc}${Look<`${A}${b}`>}`, F>
    : `${Acc}�`
  : N extends "2"
    ? R extends `${infer b}${infer c}${infer R2}`
      ? DecI<R2, `${Acc}${Look<`${A}${b}${c}`>}`, F>
      : `${Acc}�`
    : N extends "3"
      ? R extends `${infer b}${infer c}${infer d}${infer R2}`
        ? DecI<R2, `${Acc}${Look<`${A}${b}${c}${d}`>}`, F>
        : `${Acc}�`
      : DecI<R, `${Acc}�`, F>;
type Look<B extends string> = B extends keyof DecB
  ? DecB[B] & string
  : B extends keyof DecA
    ? DecA[B] & string
    : "�";
type DecO<R> = R extends ["more", infer S extends string, infer Acc extends string]
  ? DecO<DecI<S, Acc, F900>>
  : R;

/** The text of UTF-8 byte string B (invalid sequences become U+FFFD). */
export type FromUtf8<B extends string> = DecO<DecI<B, "", F900>> & string;
