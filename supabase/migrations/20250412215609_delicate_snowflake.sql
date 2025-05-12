/*
  # Add Medal Override Feature

  1. Changes
    - Add medal column to game_score table
    - Add index for better query performance
    - Maintain existing RLS policies

  2. Security
    - No changes to security model
    - Maintain existing RLS policies
*/

-- Add medal column to game_score table
ALTER TABLE game_score
ADD COLUMN IF NOT EXISTS medal text CHECK (medal IN ('gold', 'silver', 'bronze'));

-- Create index for medal column
CREATE INDEX IF NOT EXISTS idx_game_score_medal ON game_score(medal);