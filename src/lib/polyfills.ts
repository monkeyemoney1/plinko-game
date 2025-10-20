// Polyfill для Buffer и глобальных переменных в браузере
import { browser } from '$app/environment';

if (browser) {
  // Синхронно добавляем global, если его нет
  if (typeof global === 'undefined') {
    (globalThis as any).global = globalThis;
  }
  
  // Асинхронно загружаем Buffer
  import('buffer').then(({ Buffer }) => {
    // Добавляем Buffer в глобальную область видимости
    if (typeof window !== 'undefined') {
      (window as any).Buffer = Buffer;
    }

    if (typeof (globalThis as any).Buffer === 'undefined') {
      (globalThis as any).Buffer = Buffer;
    }
  }).catch(() => {
    // Игнорируем ошибки загрузки Buffer - не критично
  });
}