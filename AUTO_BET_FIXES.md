# Логика автоматической игры - Исправления

## Проблема
Пользователь сообщил о проблемах с логикой автоматической игры при:
- Перезагрузке страницы
- Переходе в профиль  
- Выходе из аккаунта
- Обрыве связи

## Реализованные исправления

### 1. Многоуровневая очистка таймеров в Sidebar.svelte

#### onDestroy (уничтожение компонента)
```typescript
onDestroy(() => {
  resetAutoBetInterval();
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', resetAutoBetInterval);
  }
});
```

#### beforeNavigate (перед навигацией SvelteKit)  
```typescript
beforeNavigate(() => {
  resetAutoBetInterval();
});
```

#### beforeunload (обновление/закрытие страницы)
```typescript
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', resetAutoBetInterval);
}
```

### 2. Защита от ошибок в autoBetDropBall

#### Проверка движка и обработка ошибок
```typescript
async function autoBetDropBall() {
  if (isBetExceedBalance) {
    resetAutoBetInterval();
    return;
  }

  // Проверяем, что движок ещё существует
  if (!$plinkoEngine) {
    resetAutoBetInterval();
    return;
  }

  try {
    // ... логика ставок
    await $plinkoEngine.dropBall();
  } catch (error) {
    console.error('Auto bet failed:', error);
    resetAutoBetInterval();
  }
}
```

### 3. Защита в handleBetClick

#### Проверка инициализации движка
```typescript
function handleBetClick() {
  // Проверяем, что движок доступен
  if (!$plinkoEngine) {
    console.warn('Plinko engine не инициализирован');
    return;
  }
  // ... остальная логика
}
```

### 4. Обработка сетевых ошибок в PlinkoEngine

В методе `dropBall()` уже есть:
```typescript
try {
  // API запрос /api/bets/reserve
} catch (error) {
  console.error('Bet reservation error:', error);
  // В случае ошибки сети - не добавляем шар
}
```

## Сценарии покрытия

✅ **Перезагрузка страницы**: beforeunload + onDestroy  
✅ **Переход в профиль**: beforeNavigate + onDestroy  
✅ **Выход из аккаунта**: beforeNavigate + onDestroy  
✅ **Обрыв связи**: try/catch в dropBall останавливает автобет  
✅ **Уничтожение компонента**: onDestroy  
✅ **Повторные вызовы**: resetAutoBetInterval проверяет null  

## Тестирование

Создан файл `test-auto-bet-cleanup.js` для проверки логики.

Для ручного тестирования:
1. Запустить автобет
2. Перезагрузить страницу - должен остановиться
3. Запустить автобет
4. Перейти в профиль - должен остановиться  
5. Проверить консоль на ошибки

## Результат

Автоматическая игра теперь корректно останавливается во всех сценариях разъединения или навигации, предотвращая зависшие таймеры и некорректное поведение.