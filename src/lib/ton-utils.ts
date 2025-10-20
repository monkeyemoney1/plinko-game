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
    return addr.toString({ urlSafe: true, bounceable: true });
  } catch (e) {
    console.log('Address normalization failed, using original:', e);
    return address;
  }
}