const { mnemonicNew, mnemonicToWalletKey } = require('@ton/crypto');
const { WalletContractV4 } = require('@ton/ton');

async function generateWallet() {
  try {
    console.log('🔐 Generating new TON wallet for production...\n');
    
    // Generate new mnemonic
    const mnemonic = await mnemonicNew();
    console.log('📝 Mnemonic phrase (24 words):');
    console.log(`"${mnemonic.join(' ')}"`);
    console.log('⚠️  IMPORTANT: Save this mnemonic phrase securely! It cannot be recovered.\n');
    
    // Generate wallet key
    const walletKey = await mnemonicToWalletKey(mnemonic);
    
    // Create wallet contract
    const wallet = WalletContractV4.create({
      publicKey: walletKey.publicKey,
      workchain: 0
    });
    
    console.log('🏦 Wallet Information:');
    console.log(`Address: ${wallet.address.toString()}`);
    console.log(`Public Key: ${walletKey.publicKey.toString('hex')}`);
    console.log('\n📋 Add to your .env file:');
    console.log(`GAME_WALLET_MNEMONIC="${mnemonic.join(' ')}"`);
    console.log(`GAME_WALLET_ADDRESS=${wallet.address.toString()}`);
    
    console.log('\n⚠️  Security Notes:');
    console.log('1. Never share your mnemonic phrase');
    console.log('2. Store it securely (encrypted backup)'); 
    console.log('3. This wallet will hold real TON tokens');
    console.log('4. Fund this wallet before going live');
    console.log('5. Use testnet first for testing');
    
  } catch (error) {
    console.error('❌ Error generating wallet:', error);
    process.exit(1);
  }
}

generateWallet();