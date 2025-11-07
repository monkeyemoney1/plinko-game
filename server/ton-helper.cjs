// Node.js-only TON helper for withdrawals
const { TonClient, Address, WalletContractV4, internal, toNano } = require('@ton/ton');
const { mnemonicToWalletKey } = require('@ton/crypto');

function createTonClient(cfg) {
  const endpoint = cfg.endpoint || (cfg.network === 'mainnet'
    ? 'https://toncenter.com/api/v2/jsonRPC'
    : 'https://testnet.toncenter.com/api/v2/jsonRPC');
  return new TonClient({ endpoint, apiKey: cfg.apiKey });
}

function parseAddress(addr) {
  return Address.parse(addr);
}

async function openGameWallet(client, mnemonic) {
  const keyPair = await mnemonicToWalletKey(mnemonic.trim().split(/\s+/));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  return { contract, keyPair };
}

async function sendTon(client, sender, to, amountTon, comment) {
  const seqno = await sender.contract.getSeqno();
  const msg = internal({
    to: parseAddress(to),
    value: toNano(amountTon.toString()),
    bounce: false
  });
  await sender.contract.sendTransfer({
    secretKey: sender.keyPair.secretKey,
    seqno,
    messages: [msg]
  });
  return { seqno };
}

async function waitSeqno(client, wallet, startSeqno, timeoutMs = 60000, retries = 2) {
  const start = Date.now();
  let attempt = 0;
  let iteration = 0;
  // Базовая стратегия: плавное увеличение интервала (backoff) до 5-6 секунд
  while (Date.now() - start < timeoutMs) {
    try {
      const current = await wallet.getSeqno();
      if (current > startSeqno) return true;
    } catch (err) {
      attempt++;
      console.warn(`[waitSeqno] Error checking seqno (attempt ${attempt}/${retries}):`, err instanceof Error ? err.message : String(err));
      if (attempt >= retries) {
        throw err; // После исчерпания попыток выбрасываем ошибку
      }
    }
    iteration++;
    // Интервал растёт: первые 2 попытки 3s, потом 4s, затем 5s
    const delay = iteration < 3 ? 3000 : iteration < 6 ? 4000 : 5000;
    await new Promise((r) => setTimeout(r, delay));
  }
  return false;
}

module.exports = { createTonClient, openGameWallet, sendTon, waitSeqno };
