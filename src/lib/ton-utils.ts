// Утилиты для работы с TON адресами только в браузере
import { browser } from '$app/environment';

export async function normalizeAddressClient(address: string): Promise<string> {
  if (!browser) {
    return address;
  }

  try {
    // Динамически импортируем @ton/core только в браузере
    const { Address } = await import('@ton/core');
    const addr = Address.parse(address);
    // Возвращаем в user-friendly формате (UQ... 48 символов)
    return addr.toString({ urlSafe: true, bounceable: false, testOnly: false });
  } catch (e) {
    console.log('Address normalization failed, using original:', e);
    return address;
  }
}

export async function toUserFriendlyAddress(address: string): Promise<string> {
  if (!browser) {
    return address;
  }

  try {
    // Если адрес уже начинается с UQ, возвращаем как есть
    if (address.startsWith('UQ') && address.length === 48) {
      return address;
    }
    
    // Конвертируем в user-friendly формат
    const { Address } = await import('@ton/core');
    const addr = Address.parse(address);
    return addr.toString({ urlSafe: true, bounceable: false, testOnly: false });
  } catch (e) {
    console.log('User-friendly address conversion failed, using original:', e);
    return address;
  }
}