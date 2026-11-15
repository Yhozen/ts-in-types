// microsoft/TypeScript tests/cases/compiler/localImportNameVsGlobalName.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
namespace Keyboard {
  export enum Key {
    UP,
    DOWN,
    LEFT,
    RIGHT,
  }
}

namespace App {
  import Key = Keyboard.Key;

  export function foo(key: Key): void {}

  foo(Key.UP);
  foo(Key.DOWN);
  foo(Key.LEFT);
}
