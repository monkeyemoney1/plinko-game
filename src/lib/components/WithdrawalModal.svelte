<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tonBalance } from '$lib/stores/balance';
  import { currentUser } from '$lib/stores/user';

  const dispatch = createEventDispatcher();

  let withdrawalAmount = 0.5;
  let walletAddress = '';
  let isProcessing = false;
  let withdrawalResult: any = null;
  let error = '';

  $: minWithdrawal = 0.1;
  $: maxWithdrawal = $tonBalance;
  $: isValidAmount = withdrawalAmount >= minWithdrawal && withdrawalAmount <= maxWithdrawal;

  async function handleWithdraw() {
    if (!isValidAmount || !walletAddress.trim()) {
      error = 'Проверьте сумму и адрес кошелька';
      return;
    }

    isProcessing = true;
    error = '';
    
    try {
      // Создаем запрос на вывод
      const createResponse = await fetch('/api/withdrawals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: $currentUser?.id,
          amount: withdrawalAmount,
          wallet_address: walletAddress
        })
      });

      const createResult = await createResponse.json();
      
      if (!createResult.success) {
        throw new Error(createResult.error);
      }

      // Автоматически обрабатываем вывод
      const processResponse = await fetch('/api/withdrawals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_id: createResult.withdrawal.id
        })
      });

      const processResult = await processResponse.json();
      
      if (processResult.success) {
        withdrawalResult = processResult.withdrawal;
        
        // Обновляем баланс в сторе
        tonBalance.update(balance => balance - withdrawalAmount);
        
        // Уведомляем родительский компонент
        dispatch('withdrawal-success', {
          amount: withdrawalAmount,
          txHash: processResult.withdrawal.transaction_hash
        });
        
        // Сбрасываем форму
        withdrawalAmount = 0.5;
        walletAddress = '';
        
      } else {
        throw new Error(processResult.error);
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Ошибка при выводе средств';
      console.error('Withdrawal error:', err);
    } finally {
      isProcessing = false;
    }
  }

  function closeModal() {
    dispatch('close');
  }
</script>

<div class="modal-overlay" on:click={closeModal}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h2>💸 Вывод средств</h2>
      <button class="close-btn" on:click={closeModal}>×</button>
    </div>

    <div class="modal-body">
      <div class="balance-info">
        <p>Доступно для вывода: <strong>{$tonBalance.toFixed(3)} TON</strong></p>
        <p class="min-amount">Минимальная сумма: {minWithdrawal} TON</p>
      </div>

      {#if withdrawalResult}
        <div class="success-message">
          <h3>✅ Вывод успешно выполнен!</h3>
          <p><strong>Сумма:</strong> {withdrawalResult.amount} TON</p>
          <p><strong>Адрес:</strong> {withdrawalResult.wallet_address}</p>
          <p><strong>Hash транзакции:</strong> {withdrawalResult.transaction_hash}</p>
          <p class="note">Средства будут доступны в вашем кошельке в течение нескольких минут.</p>
        </div>
      {:else}
        <form on:submit|preventDefault={handleWithdraw}>
          <div class="form-group">
            <label for="amount">Сумма для вывода (TON):</label>
            <input
              id="amount"
              type="number"
              bind:value={withdrawalAmount}
              min={minWithdrawal}
              max={maxWithdrawal}
              step="0.1"
              disabled={isProcessing}
              class:invalid={!isValidAmount}
            />
            {#if !isValidAmount}
              <p class="error-text">
                Сумма должна быть от {minWithdrawal} до {maxWithdrawal.toFixed(3)} TON
              </p>
            {/if}
          </div>

          <div class="form-group">
            <label for="wallet">Адрес кошелька для получения:</label>
            <input
              id="wallet"
              type="text"
              bind:value={walletAddress}
              placeholder="UQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG"
              disabled={isProcessing}
              required
            />
            <p class="help-text">Введите адрес TON кошелька для получения средств</p>
          </div>

          {#if error}
            <div class="error-message">
              {error}
            </div>
          {/if}

          <div class="form-actions">
            <button 
              type="submit" 
              class="withdraw-btn"
              disabled={isProcessing || !isValidAmount || !walletAddress.trim()}
            >
              {#if isProcessing}
                <span class="spinner"></span>
                Обработка...
              {:else}
                Вывести {withdrawalAmount} TON
              {/if}
            </button>
            
            <button type="button" class="cancel-btn" on:click={closeModal}>
              Отмена
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
  }

  .modal-header h2 {
    margin: 0;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #333;
  }

  .modal-body {
    padding: 20px;
  }

  .balance-info {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
  }

  .balance-info p {
    margin: 5px 0;
  }

  .min-amount {
    color: #666;
    font-size: 0.9em;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
  }

  .form-group input {
    width: 100%;
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
    transition: border-color 0.3s;
  }

  .form-group input:focus {
    border-color: #007bff;
    outline: none;
  }

  .form-group input.invalid {
    border-color: #dc3545;
  }

  .help-text {
    color: #666;
    font-size: 0.85em;
    margin-top: 5px;
  }

  .error-text {
    color: #dc3545;
    font-size: 0.85em;
    margin-top: 5px;
  }

  .error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 15px;
  }

  .success-message {
    background: #d1edff;
    color: #0c5460;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  .success-message h3 {
    margin-top: 0;
    color: #28a745;
  }

  .success-message p {
    margin: 10px 0;
  }

  .success-message .note {
    font-style: italic;
    color: #666;
  }

  .form-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .withdraw-btn {
    flex: 1;
    background: #28a745;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .withdraw-btn:hover:not(:disabled) {
    background: #218838;
  }

  .withdraw-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .cancel-btn {
    background: #6c757d;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
  }

  .cancel-btn:hover {
    background: #5a6268;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .form-actions {
      flex-direction: column;
    }
  }
</style>