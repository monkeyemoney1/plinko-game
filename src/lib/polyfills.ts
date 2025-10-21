// Polyfill для Buffer в браузере
import { browser } from '$app/environment';

if (browser) {
  // Импортируем buffer только в браузере
  import('buffer').then(({ Buffer }) => {
    // Добавляем Buffer в глобальную область видимости
    if (typeof window !== 'undefined') {
      (window as any).Buffer = Buffer;
    }

    if (typeof (globalThis as any).Buffer === 'undefined') {
      (globalThis as any).Buffer = Buffer;
    }
  });

  if (typeof global === 'undefined') {
    (globalThis as any).global = globalThis;
  }
}