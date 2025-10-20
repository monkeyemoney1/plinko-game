// Polyfill для Buffer и глобальных переменных в браузере
import { browser } from '$app/environment';
import { Buffer } from 'buffer';

if (browser) {
  // Синхронно добавляем global и Buffer
  if (typeof global === 'undefined') {
    (globalThis as any).global = globalThis;
  }
  
  // Добавляем Buffer в глобальную область видимости синхронно
  if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
  }

  if (typeof (globalThis as any).Buffer === 'undefined') {
    (globalThis as any).Buffer = Buffer;
  }
}