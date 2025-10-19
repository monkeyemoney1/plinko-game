import { TonClient, Address, WalletContractV4, internal, toNano } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';

export type TonNetwork = 'mainnet' | 'testnet';

export interface TonConfig {
  network: TonNetwork;
  apiKey?: string;
  endpoint?: string; // кастомный, если нужен
}

export function createTonClient(cfg: TonConfig) {
  const endpoint = cfg.endpoint || (cfg.network === 'mainnet'
    ? 'https://toncenter.com/api/v2/jsonRPC'
    : 'https://testnet.toncenter.com/api/v2/jsonRPC');

  return new TonClient({ endpoint, apiKey: cfg.apiKey });
}

export function parseAddress(addr: string): Address {
  // Принимаем адреса форматов raw (0:) и user-friendly (EQ/UQ)
  return Address.parse(addr);
}

export async function openGameWallet(client: TonClient, mnemonic: string) {
  const keyPair = await mnemonicToWalletKey(mnemonic.trim().split(/\s+/));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  return { contract, keyPair };
}

export async function sendTon(
  client: TonClient,
  sender: { contract: any; keyPair: any },
  to: string,
  amountTon: number,
  comment?: string
) {
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

export async function waitSeqno(client: TonClient, wallet: any, startSeqno: number, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await wallet.getSeqno();
    if (current > startSeqno) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}