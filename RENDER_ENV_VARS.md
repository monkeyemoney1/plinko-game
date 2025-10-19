# 🎯 ВАЖНО: ДОБАВЬТЕ АДРЕС КОШЕЛЬКА В RENDER!

## Ваш игровой кошелек:
```
UQBUqJjVTapj2_4J_CMte8FWrJ2hy4WRBIJLBymMuATA2jCX
```

## Что нужно сделать в Render:

1. Откройте ваш Web Service в Render Dashboard
2. Перейдите на вкладку **"Environment"**
3. Нажмите **"Add Environment Variable"**
4. Добавьте:
   ```
   Key: GAME_WALLET_ADDRESS
   Value: UQBUqJjVTapj2_4J_CMte8FWrJ2hy4WRBIJLBymMuATA2jCX
   ```
5. Нажмите **"Save Changes"**

Render автоматически перезапустит сервис с новой переменной!

## Полный список переменных для Render:

```
NODE_ENV = production
DATABASE_URL = ваш_postgres_url_из_render
TON_API_KEY = AEBE4GOFFSWC2MAAAAAFVZ24DO3WJWH7IKYUQDS2EF6UAIS2ULVW5XDB4YU3VQYHPGHIC6A
TON_NETWORK = testnet
SESSION_SECRET = super_secure_random_string_123456789
GAME_WALLET_ADDRESS = UQBUqJjVTapj2_4J_CMte8FWrJ2hy4WRBIJLBymMuATA2jCX
```

Опционально:
```
GAME_MIN_BET = 1
GAME_MAX_BET = 1000
LOG_LEVEL = info
```

## После добавления переменных:

✅ Render перезапустит сервис  
✅ Адрес кошелька будет использоваться для депозитов  
✅ API `/api/game/wallet` вернет правильный адрес