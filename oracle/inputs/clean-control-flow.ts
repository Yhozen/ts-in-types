function classify(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    if (i % 15 === 0) out += "FizzBuzz";
    else if (i % 3 === 0) out += "Fizz";
    else if (i % 5 === 0) out += "Buzz";
    else out += i;
  }
  while (out.length > 100) out = out.substring(1);
  do { n--; } while (n > 0);
  try { throw new Error("x"); } catch (e) { out += String(e); } finally { n = 0; }
  return out;
}
