import { mnemonicToWalletKey } from '@ton/crypto';
import { TonClient, WalletContractV4, internal, toNano, fromNano } from '@ton/ton';
import { env } from '$env/dynamic/private';

/**
 * Отправляет TON на указанный адрес
 */
export async function sendTonTransfer(
  recipientAddress: string,
  amount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log(`[TON Transfer] Starting transfer of ${amount} TON to ${recipientAddress}`);

    // Проверяем переменные окружения
    const mnemonic = env.GAME_WALLET_MNEMONIC;
    const network = env.TON_NETWORK || 'testnet';

    if (!mnemonic) {
      throw new Error('GAME_WALLET_MNEMONIC not configured');
    }

    // Разбираем мнемонику
    const mnemonicArray = mnemonic.replace(/"/g, '').trim().split(/\s+/);
    if (mnemonicArray.length !== 24) {
      throw new Error(`Invalid mnemonic: expected 24 words, got ${mnemonicArray.length}`);
    }

    // Создаём ключи из мнемоники
    const keyPair = await mnemonicToWalletKey(mnemonicArray);

    // Подключаемся к сети
    const endpoint = network === 'testnet'
      ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
      : 'https://toncenter.com/api/v2/jsonRPC';

    const client = new TonClient({ endpoint });

    // Создаём кошелёк
    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: keyPair.publicKey
    });

    const contract = client.open(wallet);

    // Проверяем баланс
    const balance = await contract.getBalance();
    const balanceTon = parseFloat(fromNano(balance));
    
    console.log(`[TON Transfer] Wallet balance: ${balanceTon} TON`);

    if (balanceTon < amount) {
      throw new Error(`Insufficient balance: ${balanceTon} TON, required: ${amount} TON`);
    }

    // Получаем seqno
    const seqno = await contract.getSeqno();
    console.log(`[TON Transfer] Current seqno: ${seqno}`);

    // Отправляем транзакцию
    await contract.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          value: toNano(amount),
          to: recipientAddress,
          body: 'Withdrawal from Plinko Game'
        })
      ]
    });

    console.log(`[TON Transfer] Transaction sent, waiting for confirmation...`);

    // Ждём изменения seqno (подтверждение транзакции)
    let currentSeqno = seqno;
    let attempts = 0;
    const maxAttempts = 30; // 30 секунд

    while (currentSeqno === seqno && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        currentSeqno = await contract.getSeqno();
      } catch (e) {
        console.warn(`[TON Transfer] Failed to get seqno on attempt ${attempts}:`, e);
      }
      attempts++;
    }

    if (currentSeqno === seqno) {
      console.warn(`[TON Transfer] Transaction not confirmed after ${maxAttempts} seconds`);
      return {
        success: true, // Считаем успешной, т.к. отправили
        txHash: `pending_${Date.now()}`,
        error: 'Transaction sent but not yet confirmed'
      };
    }

    console.log(`[TON Transfer] Transaction confirmed! New seqno: ${currentSeqno}`);

    // Пытаемся получить хеш транзакции
    const txHash = await getLatestTransactionHash(contract);

    return {
      success: true,
      txHash: txHash || `confirmed_${currentSeqno}`
    };

  } catch (error) {
    console.error('[TON Transfer] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Получает хеш последней транзакции
 */
async function getLatestTransactionHash(contract: any): Promise<string | null> {
  try {
    const transactions = await contract.getTransactions();
    if (transactions.length > 0) {
      const tx = transactions[0];
      return tx.hash().toString('hex');
    }
  } catch (e) {
    console.warn('[TON Transfer] Failed to get transaction hash:', e);
  }
  return null;
}
