-- Add last_client_feedback_date column to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS last_client_feedback_date TIMESTAMP WITH TIME ZONE;

-- Add last_client_feedback_date column to court_cases
ALTER TABLE court_cases
ADD COLUMN IF NOT EXISTS last_client_feedback_date TIMESTAMP WITH TIME ZONE;

-- Add last_client_feedback_date column to letters
ALTER TABLE letters
ADD COLUMN IF NOT EXISTS last_client_feedback_date TIMESTAMP WITH TIME ZONE;
