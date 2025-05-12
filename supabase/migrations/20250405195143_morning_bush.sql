/*
  # Add Olympic Description and Player Paid Fields

  1. Changes
    - Add description field to olympic table
      - text field, nullable
      - Stores rich text content for olympic descriptions
    
    - Add paid field to olympic_player table
      - boolean field, default false
      - Tracks payment status of players

  2. Security
    - Maintain existing RLS policies
    - No additional security changes needed
*/

-- Add description field to olympic table
ALTER TABLE olympic
ADD COLUMN IF NOT EXISTS description text;

-- Add paid field to olympic_player table
ALTER TABLE olympic_player
ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false;

-- Create index for paid field to improve query performance
CREATE INDEX IF NOT EXISTS idx_olympic_player_paid ON olympic_player(paid);