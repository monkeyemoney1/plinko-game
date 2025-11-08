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
  
  while (Date.now() - start < timeoutMs) {
    try {
      const current = await wallet.getSeqno();
      if (current > startSeqno) return true;
    } catch (err) {
      attempt++;
      console.warn(`[waitSeqno] Error checking seqno (attempt ${attempt}/${retries}):`, err instanceof Error ? err.message : String(err));
      if (attempt >= retries) {
        throw err; // Выбрасываем ошибку после исчерпания попыток
      }
    }
    // Увеличиваем интервал до 3-4 секунд для снижения нагрузки на RPC
    await new Promise((r) => setTimeout(r, 3500));
  }
  return false;
}

module.exports = { createTonClient, openGameWallet, sendTon, waitSeqno };

// Создание подписанного внешнего сообщения (BOC) без отправки
// Возвращает base64 BOC и использованный seqno
async function createTransferBoc(client, sender, to, amountTon, comment, providedSeqno) {
  const seqno = providedSeqno ?? (await sender.contract.getSeqno());
  const msg = internal({
    to: parseAddress(to),
    value: toNano(amountTon.toString()),
    bounce: false
  });
  const ext = await sender.contract.createTransfer({
    secretKey: sender.keyPair.secretKey,
    seqno,
    messages: [msg],
    // небольшой TTL
    validUntil: Math.floor(Date.now() / 1000) + 300
  });
  const boc = Buffer.from(ext.toBoc().buffer);
  const bocBase64 = boc.toString('base64');
  return { bocBase64, seqno };
}

module.exports.createTransferBoc = createTransferBoc;
