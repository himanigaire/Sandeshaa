// global.d.ts
// Type declarations for globals available in React Native's Hermes engine

declare function atob(data: string): string;
declare function btoa(data: string): string;

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

declare class TextDecoder {
  decode(input?: ArrayBufferView | ArrayBuffer): string;
}
