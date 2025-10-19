# 🔑 КАК СОЗДАТЬ GITHUB PERSONAL ACCESS TOKEN

## Если GitHub просит пароль при git push:

1. Откройте: https://github.com/settings/tokens
2. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
3. Заполните форму:
   - **Note**: "Plinko Game Deploy"
   - **Expiration**: 90 days (или No expiration)
   - **Select scopes**: отметьте галочкой **"repo"** (все подпункты автоматически отметятся)
4. Прокрутите вниз и нажмите **"Generate token"**
5. **ВАЖНО**: Скопируйте токен сразу! Он показывается только один раз!
   - Формат: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Использование токена:

При выполнении `git push` GitHub попросит:
- **Username**: ваш GitHub username
- **Password**: **вставьте токен** (не пароль!)

Токен можно использовать вместо пароля во всех Git командах.

---

## Альтернатива: SSH ключ (более безопасно)

Если хотите настроить SSH (один раз):

```powershell
# Генерация SSH ключа
ssh-keygen -t ed25519 -C "your_email@example.com"

# Просмотр публичного ключа
cat ~/.ssh/id_ed25519.pub
```

Затем:
1. Откройте: https://github.com/settings/keys
2. "New SSH key"
3. Вставьте содержимое `id_ed25519.pub`
4. Используйте SSH URL: `git@github.com:USERNAME/plinko-game.git`