enum Level { Low = 1, Mid, High }
namespace Util {
  export function describe(l: Level): string {
    return l === Level.High ? "high" : "not high";
  }
}
const d: string = Util.describe(Level.Mid);
