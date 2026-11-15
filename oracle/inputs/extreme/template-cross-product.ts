// A union of digits crossed with itself through a template literal (10,000 members).
type D = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type DD = `${D}${D}`;
type DDDD = `${DD}${DD}`;
const a: DDDD = "1234";
const b: DDDD = "12345";
