import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';
import { Address } from '@ton/core';
import { env } from '$env/dynamic/private';

/**
 * TON Client configuration and utilities for production
 */
export class TonManager {
  private client: TonClient;
  private wallet: WalletContractV4 | null = null;
  private walletKey: any = null;

  constructor() {
    // Initialize TON client with endpoint
    const endpoint = env.TON_NETWORK === 'testnet' 
      ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
      : 'https://toncenter.com/api/v2/jsonRPC';
    
    this.client = new TonClient({
      endpoint,
      apiKey: env.TONCENTER_API_KEY
    });
  }

  /**
   * Initialize game wallet from mnemonic
   */
  async initializeWallet(): Promise<void> {
    const mnemonic = env.GAME_WALLET_MNEMONIC;
    if (!mnemonic) {
      throw new Error('GAME_WALLET_MNEMONIC not configured');
    }

    try {
      // Convert mnemonic to wallet key
      this.walletKey = await mnemonicToWalletKey(mnemonic.split(' '));
      
      // Create wallet contract
      this.wallet = WalletContractV4.create({
        publicKey: this.walletKey.publicKey,
        workchain: 0
      });

      console.log('Wallet initialized:', this.wallet.address.toString());
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance in TON
   */
  async getBalance(): Promise<number> {
    if (!this.wallet) {
      await this.initializeWallet();
    }

    try {
      const balance = await this.client.getBalance(this.wallet!.address);
      return Number(balance) / 1e9; // Convert from nanotons to TON
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  /**
   * Send TON to specified address
   */
  async sendTon(
    toAddress: string, 
    amount: number, 
    comment?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.wallet || !this.walletKey) {
      await this.initializeWallet();
    }

    try {
      // Validate address
      const destinationAddress = Address.parse(toAddress);
      
      // Convert TON to nanotons
      const amountNano = Math.floor(amount * 1e9);
      
      // Create wallet contract
      const walletContract = this.client.open(this.wallet!);
      
      // Get current seqno
      const seqno = await walletContract.getSeqno();
      
      // Create transfer message
      const transfer = walletContract.createTransfer({
        seqno,
        secretKey: this.walletKey.secretKey,
        messages: [internal({
          to: destinationAddress,
          value: amountNano.toString(),
          body: comment || '',
          bounce: false
        })]
      });

      // Send transaction
      await walletContract.send(transfer);
      
      // Wait for confirmation
      const txHash = await this.waitForTransaction(seqno);
      
      return {
        success: true,
        txHash
      };
    } catch (error) {
      console.error('Failed to send TON:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(seqno: number): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    const walletContract = this.client.open(this.wallet);
    
    // Wait for seqno to increment
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const currentSeqno = await walletContract.getSeqno();
        if (currentSeqno > seqno) {
          // Get last transaction
          const transactions = await this.client.getTransactions(
            this.wallet.address, 
            { limit: 1 }
          );
          
          if (transactions.length > 0) {
            return transactions[0].hash().toString('hex');
          }
        }
      } catch (error) {
        console.log(`Waiting for confirmation... attempt ${attempt + 1}`);
      }
    }
    
    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Verify incoming transaction
   */
  async verifyTransaction(
    txHash: string,
    expectedAmount: number,
    expectedSender: string
  ): Promise<{ verified: boolean; actualAmount?: number }> {
    try {
      // For production, implement transaction verification
      // This would involve checking the blockchain for the specific transaction
      
      // Placeholder implementation
      console.log('Verifying transaction:', { txHash, expectedAmount, expectedSender });
      
      // In real implementation, you would:
      // 1. Query the transaction by hash
      // 2. Verify sender, recipient, and amount
      // 3. Check transaction status
      
      return {
        verified: true,
        actualAmount: expectedAmount
      };
    } catch (error) {
      console.error('Failed to verify transaction:', error);
      return { verified: false };
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransaction(txHash: string): Promise<any> {
    try {
      // Implementation would query blockchain for transaction details
      // This is a placeholder
      console.log('Getting transaction:', txHash);
      return null;
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tonManager = new TonManager();

/**
 * Utility functions for address handling
 */
export function isValidTonAddress(address: string): boolean {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}

export function formatTonAddress(address: string): string {
  try {
    return Address.parse(address).toString();
  } catch {
    return address;
  }
}