// Утилиты для работы с TON адресами только в браузере
import { browser } from '$app/environment';

/**
 * Конвертирует адрес в user-friendly формат (UQ, 48 символов)
 * UQ = non-bounceable, urlSafe
 */
export async function normalizeAddressClient(address: string): Promise<string> {
  if (!browser) {
    return address;
  }

  try {
    // Динамически импортируем @ton/core только в браузере
    const { Address } = await import('@ton/core');
    const addr = Address.parse(address);
    // User-friendly формат: non-bounceable (UQ) и urlSafe
    return addr.toString({ urlSafe: true, bounceable: false });
  } catch (e) {
    console.log('Address normalization failed, using original:', e);
    return address;
  }
}

/**
 * Проверяет, является ли адрес уже в user-friendly формате
 */
export function isUserFriendlyAddress(address: string): boolean {
  // User-friendly адреса начинаются с EQ (bounceable) или UQ (non-bounceable)
  // и имеют 48 символов
  return /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(address);
}