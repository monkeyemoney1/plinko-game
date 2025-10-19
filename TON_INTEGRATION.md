# 🔗 Интеграция с реальным блокчейном TON

## Текущее состояние
✅ Система вывода работает с мок-транзакциями  
❌ Реальные переводы TON не выполняются  

## Для реальной интеграции нужно:

### 1. Установить TON SDK
```bash
npm install @ton/ton @ton/core @ton/crypto
```

### 2. Получить приватный ключ игрового кошелька
```javascript
// Генерация нового кошелька (ТОЛЬКО для разработки!)
import { mnemonicToWalletKey } from '@ton/crypto';

const mnemonic = "ваша мнемоническая фраза из 24 слов";
const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
const privateKey = keyPair.secretKey;
const publicKey = keyPair.publicKey;
```

### 3. Включить реальную отправку в `/api/withdrawals/process`
```typescript
// Уже реализовано: при наличии GAME_WALLET_MNEMONIC бэкенд
// отправляет реальную транзакцию TON с использованием @ton/ton.
// Файл: src/lib/ton.ts — утилиты клиента и кошелька
// Файл: src/routes/api/withdrawals/process/+server.ts — логика отправки

// Инициализация клиента
// Используется TonClient с endpoint Toncenter (mainnet/testnet) и apiKey (если задан)

// Ключи читаются из переменной окружения GAME_WALLET_MNEMONIC (24 слова)
// Отправка: sendTon(...); подтверждение: waitSeqno(...)
```

### 4. Добавить переменные окружения
```env
# .env
TON_NETWORK=mainnet # или testnet
TONCENTER_API_KEY=ваш_api_key_из_toncenter (опционально)
TONCENTER_ENDPOINT=https://toncenter.com/api/v2/jsonRPC (или кастомный)
GAME_WALLET_MNEMONIC="слова мнемоники через пробел (24 слова)"
```

### 5. Проверка статуса транзакции
```typescript
// Ожидание подтверждения
let confirmed = false;
let attempts = 0;
const maxAttempts = 30;

while (!confirmed && attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const txStatus = await client.getTransaction(
      wallet.address,
      seqno.toString()
    );
    
    if (txStatus) {
      confirmed = true;
      console.log('Transaction confirmed:', txStatus);
    }
  } catch (e) {
    console.log('Waiting for confirmation...');
  }
  
  attempts++;
}
```

## ⚠️ Безопасность

1. **НЕ ХРАНИТЕ** приватные ключи/мнемонику в коде!
2. Используйте переменные окружения
3. Ограничьте доступ к серверу
4. Регулярно проверяйте баланс игрового кошелька
5. Добавьте лимиты на сумму вывода

## 🧪 Тестирование

1. Сначала тестируйте в **testnet**
2. Используйте небольшие суммы
3. Проверьте адреса получателей
4. Мониторьте успешность транзакций

## 💡 Рекомендации

- Добавьте очередь для обработки выводов
- Внедрите мониторинг и алерты
- Создайте административную панель
- Добавьте ручную модерацию крупных выводов