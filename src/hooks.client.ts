// Global browser polyfills for Node built-ins used by some libs (e.g. ton/*)
import { Buffer } from 'buffer';

// Ensure Buffer exists in all common global scopes before any component mounts
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Buffer = Buffer;
  // Some libraries expect `global` in the browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).global = window;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(globalThis as any).Buffer) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Buffer = Buffer;
}
