const counter = {
  n: 0,
  inc() {
    this.n++;
    return this;
  },
  get double() {
    return this.n * 2;
  },
};
counter.inc().inc();
const d: number = counter.double;
