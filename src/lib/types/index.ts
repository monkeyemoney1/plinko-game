export * from './game';

// User types
export interface User {
  id: number;
  username?: string;
  wallet_address?: string;
  balance: number;
  stars_balance?: number;
  telegram_id?: string;
  created_at: string;
  updated_at: string;
}

// Star transaction types
export interface StarTransaction {
  id: number;
  user_id: number;
  telegram_id: string;
  amount: number;
  payload: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

// User wallet types
export interface UserWallet {
  id: number;
  user_id: number;
  wallet_address: string;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}
