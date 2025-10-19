import { LOCAL_STORAGE_KEY } from '$lib/constants/game';
import { balance } from '$lib/stores/game';
import { get } from 'svelte/store';

export function setBalanceFromLocalStorage() {
  const rawValue = window.localStorage.getItem(LOCAL_STORAGE_KEY.BALANCE);
  const parsedValue = parseFloat(rawValue ?? '');
  if (!isNaN(parsedValue) && parsedValue >= 0) {
    balance.set(parsedValue);
  } else {
    // Если баланса нет или он некорректный, показываем дефолт (0)
    balance.set(0);
  }
}

export function writeBalanceToLocalStorage() {
  const balanceVal = get(balance);
  if (!isNaN(balanceVal)) {
    const balanceValStr = balanceVal.toFixed(2);
    window.localStorage.setItem(LOCAL_STORAGE_KEY.BALANCE, balanceValStr);
  }
}
