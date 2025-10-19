export function formatTonAddress(addr: string | null | undefined): string {
  if (!addr) return '';
  // Пользовательский friendly обычно 48 символов. Если длиннее — обрежем.
  if (addr.length >= 48) return addr.slice(0, 48);
  return addr;
}
