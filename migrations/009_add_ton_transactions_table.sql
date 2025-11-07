-- Migration: add ton_transactions table and link it to withdrawals
-- Creates detailed blockchain transaction logging similar to reference project.

CREATE TABLE IF NOT EXISTS ton_transactions (
  id SERIAL PRIMARY KEY,
  transaction_hash VARCHAR(255), -- real hash or fallback seqno_* placeholder
  transaction_type VARCHAR(32) NOT NULL, -- WITHDRAWAL / DEPOSIT / BET / PAYOUT
  amount DECIMAL(15, 6) NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','FAILED')),
  block_number BIGINT,
  fee DECIMAL(15, 6), -- parsed network fee if available from indexer
  seqno INTEGER, -- wallet seqno captured before send
  lt BIGINT, -- logical time (if parsed from indexer)
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  UNIQUE(transaction_hash)
);

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS blockchain_transaction_id INTEGER REFERENCES ton_transactions(id);

CREATE INDEX IF NOT EXISTS idx_ton_transactions_type ON ton_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ton_transactions_status ON ton_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ton_transactions_created ON ton_transactions(created_at);

COMMENT ON TABLE ton_transactions IS 'Unified TON transaction log for withdrawals/deposits/etc.';
COMMENT ON COLUMN ton_transactions.transaction_hash IS 'Real TON transaction hash or fallback placeholder.';
COMMENT ON COLUMN ton_transactions.seqno IS 'Seqno captured before sending transfer.';
COMMENT ON COLUMN ton_transactions.lt IS 'Logical time parsed from chain (if available).';
COMMENT ON COLUMN withdrawals.blockchain_transaction_id IS 'FK to ton_transactions row associated with this withdrawal.';
