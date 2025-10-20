<script lang="ts">
  import '$lib/polyfills';
  import logo from '$lib/assets/logo.svg';
  import { onMount } from 'svelte';
  import { TonConnectUI, toUserFriendlyAddress } from '@tonconnect/ui';
  import { isTelegramWebApp, getTelegramUser } from '$lib/telegram/webApp';

  let tonConnectUI: TonConnectUI;
  
  // Игровой баланс TON и Stars
  import { balance } from '$lib/stores/game';
  let tonBalance = 0;
  
  async function loadBalance() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
  tonBalance = data.user?.ton_balance ?? 0;
  const stars = data.user?.stars_balance ?? 0;
  balance.set(stars);
  localStorage.setItem('plinko_balance', String(stars));
      }
    } catch (e) {
      console.error('Не удалось загрузить баланс', e);
    }
  }
  onMount(() => {
    loadBalance();
    
    // Инициализируем TON Connect UI
    tonConnectUI = new TonConnectUI({
      manifestUrl: 'https://plinko-game-9hku.onrender.com/.well-known/tonconnect-manifest.json'
    });
    
    // Отслеживаем изменения статуса подключения кошелька
    tonConnectUI.onStatusChange((walletInfo) => {
      if (walletInfo && walletInfo.account) {
        // Кошелек подключен - отслеживаем это в БД
        trackWalletConnection(walletInfo.account.address);
      } else {
        // Кошелек отключен
        console.log('Кошелек отключен');
      }
    });
  });
  
  // Функция для отслеживания подключения кошелька
  async function trackWalletConnection(walletAddress: string) {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    
    try {
      // Конвертируем адрес в user-friendly формат (UQ, 48 символов)
      const normalizedAddress = await normalizeAddressClient(walletAddress);
      
      await fetch('/api/wallet/track-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: parseInt(userId),
          wallet_address: normalizedAddress
        })
      });
      console.log('Подключение кошелька отслежено (UQ формат):', normalizedAddress);
    } catch (error) {
      console.error('Ошибка отслеживания подключения кошелька:', error);
    }
  }
  let convertAmount = 0;
  let direction: 'tonToStars' | 'starsToTon' = 'tonToStars';
  let isDepositModalOpen = false;
  let isWithdrawModalOpen = false;
  let isStarsDepositModalOpen = false;
  let depositAmount = 0;
  let starsDepositAmount = 0;
  let withdrawAmount = 0;
  let transactions = [];
  function handleStarsDeposit() {
    isStarsDepositModalOpen = true;
    loadBalance();
  }
  function closeStarsDepositModal() {
    isStarsDepositModalOpen = false;
  }
  async function processStarsDeposit() {
    const userId = localStorage.getItem('user_id');
    if (!userId || !starsDepositAmount) {
      alert('Укажите сумму для пополнения');
      return;
    }
    
    // Получаем telegram_id пользователя из Telegram WebApp или используем userId как fallback
    let telegramId = null;
    
    if (isTelegramWebApp()) {
      // Получаем данные пользователя из Telegram WebApp
      try {
        const telegramUser = getTelegramUser();
        if (telegramUser?.id) {
          telegramId = telegramUser.id;
          console.log('Получен Telegram ID:', telegramId);
        }
      } catch (e) {
        console.warn('Не удалось получить Telegram ID:', e);
      }
    }
    
    // Fallback: используем userId как telegram_id для тестирования
    if (!telegramId) {
      telegramId = parseInt(userId) || 123456789; // Fallback ID для тестирования
      console.log('Используем fallback Telegram ID:', telegramId);
    }
    
    try {
      // Инициируем платеж Stars через новый API
      const res = await fetch('/api/payments/stars/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegram_id: telegramId,  // Изменено с user_id на telegram_id
          amount: starsDepositAmount,
          description: `Пополнение баланса игры на ${starsDepositAmount} Stars`
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Используем Telegram WebApp API для создания инвойса
        if (window.Telegram?.WebApp?.openInvoice) {
          // Открываем инвойс в Telegram
          window.Telegram.WebApp.openInvoice(data.invoice_link, (status) => {
            if (status === 'paid') {
              // Верификация платежа
              verifyStarsPayment(data.payload);
            } else if (status === 'cancelled') {
              alert('Платеж был отменен');
            } else if (status === 'failed') {
              alert('Ошибка при оплате');
            }
          });
          
          // Закрываем модалку, так как пользователь перешел к оплате
          starsDepositAmount = 0;
          closeStarsDepositModal();
        } else {
          // Fallback: показываем ссылку для оплаты
          if (confirm(`Создан инвойс на ${starsDepositAmount} Stars. Открыть ссылку для оплаты?`)) {
            window.open(data.invoice_link, '_blank');
            // В этом случае нужно будет проверять статус платежа вручную
            setTimeout(() => verifyStarsPayment(data.payload), 5000);
          }
          starsDepositAmount = 0;
          closeStarsDepositModal();
        }
      } else {
        const error = await res.json();
        alert('Ошибка создания инвойса: ' + (error.error || 'Неизвестная ошибка'));
      }
    } catch (e) {
      console.error('Stars deposit error:', e);
      alert('Ошибка: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
  
  async function verifyStarsPayment(payload: string) {
    try {
      // Получаем telegram_id аналогично processStarsDeposit
      let telegramId = null;
      
      if (isTelegramWebApp()) {
        try {
          const telegramUser = getTelegramUser();
          if (telegramUser?.id) {
            telegramId = telegramUser.id;
          }
        } catch (e) {
          console.warn('Не удалось получить Telegram ID при верификации:', e);
        }
      }
      
      // Fallback
      if (!telegramId) {
        const userId = localStorage.getItem('user_id');
        telegramId = parseInt(userId) || 123456789;
      }
      
      const res = await fetch('/api/payments/stars/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payload,
          telegram_id: telegramId,
          amount: starsDepositAmount // Передаем amount для проверки
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert(`Платеж подтвержден! Баланс пополнен на ${data.amount} Stars`);
          loadBalance();
        } else {
          alert('Платеж не подтвержден. Попробуйте позже.');
        }
      } else {
        const error = await res.json();
        console.error('Verification error:', error);
        alert('Ошибка верификации платежа: ' + (error.error || 'Неизвестная ошибка'));
      }
    } catch (e) {
      console.error('Verification error:', e);
      alert('Ошибка верификации: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
  function handleDeposit() {
    isDepositModalOpen = true;
    // Обновим данные из БД при открытии модалки
    loadBalance();
  }
  function closeDepositModal() {
    isDepositModalOpen = false;
  }
  function handleWithdraw() {
    isWithdrawModalOpen = true;
    loadBalance();
  }
  function closeWithdrawModal() {
    isWithdrawModalOpen = false;
  }
  async function processDeposit() {
    const userId = localStorage.getItem('user_id');
    const userAddress = localStorage.getItem('ton_address');
    
    console.log('processDeposit:', { userId, userAddress, depositAmount });
    
    if (!userId || !depositAmount || !userAddress) {
      alert('Необходимо подключить кошелек и указать сумму');
      return;
    }
    
    try {
      // Получаем адрес игрового кошелька
      const walletRes = await fetch('/api/game/wallet');
      if (!walletRes.ok) {
        alert('Ошибка получения адреса кошелька');
        return;
      }
      const walletData = await walletRes.json();
      const gameWalletAddress = walletData.wallet_address;
      
      // Создаем запись о депозите в базе данных
      const createRes = await fetch('/api/deposits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: depositAmount,
          wallet_address: userAddress
        })
      });
      
      if (!createRes.ok) {
        const error = await createRes.json();
        alert('Ошибка создания депозита: ' + (error.error || 'Неизвестная ошибка'));
        return;
      }
      
      // const depositData = await createRes.json();
      // depositId больше не нужен

      // Создаем транзакцию через TON Connect
      const amountNano = Math.floor(depositAmount * 1000000000); // конвертируем TON в nanotons
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут на подтверждение
        messages: [
          {
            address: gameWalletAddress,
            amount: amountNano.toString()
            // Убираем payload - он не обязателен и может вызывать ошибки
          }
        ]
      };

      // Отправляем транзакцию
      const result = await tonConnectUI.sendTransaction(transaction);

      if (result) {
        alert('Транзакция отправлена! Ожидайте подтверждения...');
        const verifyAmount = depositAmount;
        depositAmount = 0;
        closeDepositModal();
        // Проверяем статус депозита по userId, userAddress, verifyAmount
        checkDepositStatus(userId, userAddress, verifyAmount);
      }
      
    } catch (e) {
      console.error('Deposit error:', e);
      alert('Ошибка отправки транзакции: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
  
  async function checkDepositStatus(userId, userAddress, verifyAmount) {
    const maxAttempts = 40; // Максимум 40 попыток (20 минут при проверке каждые 15 сек)
    let attempts = 0;

    console.log('Starting deposit verification for:', { userId, userAddress, verifyAmount });

    const checkInterval = setInterval(async () => {
      attempts++;
      console.log(`Deposit verification attempt ${attempts}/${maxAttempts}`);

      try {
        const res = await fetch('/api/deposits/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            amount: verifyAmount,
            wallet_address: userAddress
          })
        });

        if (res.ok) {
          const data = await res.json();
          console.log('Verification response:', data);
          if (data.confirmed) {
            clearInterval(checkInterval);
            alert('Депозит подтвержден! Баланс обновлен.');
            loadBalance();
          } else if (data.error === 'API_TRANSACTIONS_UNAVAILABLE' || data.error === 'API_CONNECTION_FAILED') {
            // API недоступен, переключаемся на мок-верификацию для тестирования
            console.log('Blockchain API unavailable, trying mock verification...');
            clearInterval(checkInterval);

            try {
              const mockRes = await fetch('/api/deposits/mock-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: userId,
                  amount: verifyAmount,
                  wallet_address: userAddress,
                  force_confirm: true,
                  mock_tx_hash: `mock_${Date.now()}_auto_verify`
                })
              });

              if (mockRes.ok) {
                const mockData = await mockRes.json();
                alert('Депозит подтвержден через мок-верификацию (тестовый режим)!');
                loadBalance();
              } else {
                alert('Не удалось подтвердить депозит. Попробуйте позже.');
              }
            } catch (e) {
              console.error('Mock verification failed:', e);
              alert('Ошибка мок-верификации');
            }

          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            alert('Время ожидания истекло. Попробуйте мок-верификацию на странице test-mock.html');
          } else {
            console.log('Transaction not confirmed yet, will check again in 15 seconds');
          }
        } else {
          console.error('Verification error:', res.status);
          const errorData = await res.text();
          console.error('Error details:', errorData);
        }
      } catch (e) {
        console.error('Check status error:', e);
      }
    }, 15000); // Проверяем каждые 15 секунд
  }
  async function processWithdraw() {
    const userId = localStorage.getItem('user_id');
    const userAddress = localStorage.getItem('ton_address');
    if (!userId || !withdrawAmount || !userAddress) {
      alert('Необходимо подключить кошелек и указать сумму');
      return;
    }
    
    if (withdrawAmount <= 0) {
      alert('Сумма должна быть больше 0');
      return;
    }
    
    if (withdrawAmount > tonBalance) {
      alert('Недостаточно средств на балансе');
      return;
    }
    
    try {
      // Создаем запрос на вывод
      const createRes = await fetch('/api/withdrawals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId),
          amount: withdrawAmount,
          wallet_address: userAddress
        })
      });
      
      if (!createRes.ok) {
        const error = await createRes.json();
        alert('Ошибка создания запроса на вывод: ' + (error.error || 'Неизвестная ошибка'));
        return;
      }
      
      const createData = await createRes.json();
      const withdrawalId = createData.withdrawal.id;
      
      // Автоматически обрабатываем вывод
      const processRes = await fetch('/api/withdrawals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_id: withdrawalId
        })
      });
      
      if (processRes.ok) {
        const processData = await processRes.json();
        if (processData.success) {
          alert(`Вывод успешно выполнен!\nСумма: ${withdrawAmount} TON\nHash транзакции: ${processData.withdrawal.transaction_hash}`);
          withdrawAmount = 0;
          loadBalance();
          closeWithdrawModal();
        } else {
          alert('Ошибка обработки вывода: ' + (processData.error || 'Неизвестная ошибка'));
        }
      } else {
        const error = await processRes.json();
        alert('Ошибка обработки вывода: ' + (error.error || 'Неизвестная ошибка'));
      }
      
    } catch (e) {
      console.error('Withdrawal error:', e);
      alert('Ошибка при выводе средств: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
  function convert() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    const amt = Number(convertAmount);
    if (!isFinite(amt) || amt <= 0) return;
    fetch(`/api/users/${userId}/balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, amount: amt })
    })
      .then(r => r.json())
      .then(async data => {
        if (data?.user?.balance) {
          tonBalance = Number(data.user.balance.ton) || 0;
          const stars = Number(data.user.balance.stars) || 0;
          balance.set(stars);
          localStorage.setItem('plinko_balance', stars.toString());
          convertAmount = 0;
        }
      })
      .catch(() => {});
  }
  function logout() {
    localStorage.removeItem('plinko_is_auth');
    localStorage.removeItem('user_id');
    localStorage.removeItem('ton_address');
    // Отключаем TON Connect
    if (tonConnectUI) {
      tonConnectUI.disconnect();
    }
    window.location.replace('/auth');
  }
</script>

<style>
  /* Убираем стрелки (спиннеры) в input[type=number] для окон пополнения и вывода */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
</style>

<div class="flex flex-col items-center justify-center min-h-screen bg-gray-900">
  <div class="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md flex flex-col items-center">
  <img src={logo} alt="logo" class="h-12 mb-4" />
  <h1 class="text-2xl font-bold text-white mb-2">Профиль пользователя</h1>
  <div class="w-full mb-4">
  <div class="flex justify-between items-center mb-1">
        <span class="text-gray-300">Баланс TON:</span>
        <span class="font-bold text-white flex items-center gap-1">
          {tonBalance.toFixed(5)} TON
          <button class="ml-1 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded-full px-2 py-0.5 text-xs flex items-center" style="height:1.5em;" title="Пополнить TON" onclick={handleDeposit}>
            +
          </button>
        </span>
      </div>
  <div class="flex justify-between items-center mb-1">
        <span class="text-gray-300">Баланс ⭐️Stars:</span>
    <span class="font-bold text-yellow-400 flex items-center gap-1">
      {Number($balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ⭐️
      <button class="ml-1 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded-full px-2 py-0.5 text-xs flex items-center" style="height:1.5em;" title="Пополнить Stars" onclick={handleStarsDeposit}>
        +
      </button>
    {#if isStarsDepositModalOpen}
      <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center relative">
          <button class="absolute top-2 right-2 text-gray-400 hover:text-white text-xl" onclick={closeStarsDepositModal}>&times;</button>
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6c/TON_symbol.png" alt="Stars" class="w-16 h-16 mb-4" />
          <div class="text-yellow-400 text-lg font-bold mb-4">Пополнение Stars</div>
          <div class="w-full mb-4">
            <input type="number" min="0" step="0.01" bind:value={starsDepositAmount} class="w-full rounded px-3 py-2 bg-slate-900 text-white text-center" placeholder="Сумма для пополнения" />
          </div>
          <button class="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-2 rounded-xl font-semibold" onclick={processStarsDeposit}>
            Пополнить
          </button>
        </div>
      </div>
    {/if}
    </span>
      </div>
    </div>

    <!-- Универсальный конвертер TON <-> Stars -->
  <div class="w-full mb-4 p-4 rounded bg-slate-800 flex flex-col gap-3">
      <div class="flex flex-wrap gap-2 sm:gap-2 items-center justify-center w-full">
  <input type="number" min="0" bind:value={convertAmount} class="w-full sm:w-24 rounded px-2 py-1 bg-slate-900 text-white mb-1 sm:mb-0" placeholder="Сумма" />
  <button class="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold text-sm mb-1 sm:mb-0" onclick={() => direction = direction === 'tonToStars' ? 'starsToTon' : 'tonToStars'}>
          {direction === 'tonToStars' ? 'TON → ⭐️' : '⭐️ → TON'}
        </button>
        <button class="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold px-3 py-1 rounded mb-1 sm:mb-0" onclick={convert}>
          Конвертировать
        </button>
        <span class="w-full sm:w-auto text-white text-center">
          {direction === 'tonToStars' ? `+${convertAmount * 145} ⭐️` : `+${convertAmount / 155} TON`}
        </span>
      </div>
    </div>
  <!-- Кнопка "Пополнить баланс" удалена, открытие окна теперь на "+" -->
  <button class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-6 rounded-lg transition mb-2 w-full"
      onclick={handleWithdraw}
    >
      Вывести TON
    </button>
  <button class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-6 rounded-lg transition mb-1 w-full"
      onclick={() => window.location.replace('/')}
    >
      Перейти к игре
    </button>
    {#if isDepositModalOpen}
      <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
  <div class="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center relative">
          <button class="absolute top-2 right-2 text-gray-400 hover:text-white text-xl" onclick={closeDepositModal}>&times;</button>
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6c/TON_symbol.png" alt="TON" class="w-16 h-16 mb-4" />
          <div class="text-white text-lg font-bold mb-4">Пополнение TON</div>
          <div class="w-full mb-4">
            <input type="number" min="0" step="0.01" bind:value={depositAmount} class="w-full rounded px-3 py-2 bg-slate-900 text-white text-center" placeholder="Сумма для пополнения" />
            {#await (async () => {
              const addr = localStorage.getItem('ton_address');
              if (!addr) return null;
              const res = await fetch(`/api/wallet/balance?address=${addr}`);
              if (!res.ok) return null;
              return await res.json();
            })() then data}
              {#if data?.ton_balance != null}
                <div class="text-xs text-gray-400 mt-2 text-center">Доступно в кошельке: {Number(data.ton_balance)} TON</div>
              {:else}
                <div class="text-xs text-gray-500 mt-2 text-center">Не удалось получить баланс кошелька</div>
              {/if}
            {/await}
          </div>
          <button class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl font-semibold" onclick={processDeposit}>
            Пополнить
          </button>
        </div>
      </div>
    {/if}
    {#if isWithdrawModalOpen}
      <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
  <div class="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center relative">
          <button class="absolute top-2 right-2 text-gray-400 hover:text-white text-xl" onclick={closeWithdrawModal}>&times;</button>
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6c/TON_symbol.png" alt="TON" class="w-16 h-16 mb-4" />
          <div class="text-white text-lg font-bold mb-4">Вывод TON</div>
          <div class="w-full mb-4">
            <input type="number" min="0" step="0.01" bind:value={withdrawAmount} class="w-full rounded px-3 py-2 bg-slate-900 text-white text-center mb-3" placeholder="Сумма для вывода" />
            <div class="text-xs text-gray-400 mt-2 text-center">Доступно: {tonBalance} TON</div>
          </div>
          <button class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl font-semibold" onclick={processWithdraw}>
            Вывести
          </button>
        </div>
      </div>
    {/if}
    <div class="flex justify-end mt-4">
  <button class="bg-red-500 text-white px-4 py-2 rounded-xl" onclick={logout}>Выйти</button>
</div>
  </div>
</div>
