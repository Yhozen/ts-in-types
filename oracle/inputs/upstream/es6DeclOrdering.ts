// microsoft/TypeScript tests/cases/compiler/es6DeclOrdering.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
class Bar {

   //public bar() { }

   public foo() {
       return this._store.length;
 
   }

   constructor(store: string) {
       this._store = store; // this is an error for some reason? Unresolved symbol store
 
   } 
}

