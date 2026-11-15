class Animal { name = ""; }
class Dog extends Animal { bark() {} }
const dogs: Dog[] = [];
const animals: Animal[] = dogs;
const back: Dog[] = animals;
