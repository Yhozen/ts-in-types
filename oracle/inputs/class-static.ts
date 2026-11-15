class C {
  static count = 0;
  static inc() { return ++C.count; }
  inst() { return this.count; }
}
C.inc();
new C().inc();
