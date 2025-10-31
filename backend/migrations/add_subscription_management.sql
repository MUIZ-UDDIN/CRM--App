-- Migration: Add Subscription Management Fields
-- Date: 2025-10-31
-- Purpose: Add trial and payment tracking for single Pro plan with Square integration

-- Add subscription management columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS square_customer_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends_at ON companies(trial_ends_at);

-- Update existing companies to active status (since they're already using the system)
UPDATE companies SET 
    subscription_status = 'active',
    plan = 'pro'
WHERE subscription_status IS NULL OR subscription_status = '';

-- Add comments for documentation
COMMENT ON COLUMN companies.trial_ends_at IS '14-day trial expiration timestamp';
COMMENT ON COLUMN companies.square_customer_id IS 'Square payment gateway customer ID';
COMMENT ON COLUMN companies.subscription_status IS 'Subscription status: trial, active, expired, suspended, cancelled';
COMMENT ON COLUMN companies.monthly_price IS 'Monthly subscription price in USD';
COMMENT ON COLUMN companies.last_payment_date IS 'Last successful payment date';
COMMENT ON COLUMN companies.next_billing_date IS 'Next billing cycle date';

-- Create payment_history table for tracking all payments
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    square_payment_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- completed, failed, refunded, pending
    payment_method VARCHAR(50), -- card, ach, etc.
    card_last_4 VARCHAR(4),
    card_brand VARCHAR(50),
    receipt_url TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for payment history
CREATE INDEX IF NOT EXISTS idx_payment_history_company_id ON payment_history(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);

-- Add comments
COMMENT ON TABLE payment_history IS 'Track all payment transactions via Square';
COMMENT ON COLUMN payment_history.square_payment_id IS 'Square payment transaction ID';
