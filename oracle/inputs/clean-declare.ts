declare function external(x: number): string;
declare const VERSION: string;
declare class Ext { m(): void }
declare namespace Lib { const v: number; }
const r: string = external(Lib.v) + VERSION;
