/*
  # Add Event Locking Feature

  1. Changes
    - Add locked_at column to olympic_event table
    - Add index for better query performance
    - Maintain existing RLS policies

  2. Security
    - No changes to security model
    - Maintain existing RLS policies
*/

-- Add locked_at column to olympic_event table
ALTER TABLE olympic_event
ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Create index for locked_at column
CREATE INDEX IF NOT EXISTS idx_olympic_event_locked_at ON olympic_event(locked_at);