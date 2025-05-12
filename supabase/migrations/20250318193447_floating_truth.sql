/*
  # Fix Game Weight and Event Relationships

  1. Changes
    - Update game weight to allow 2 decimal places from 0-5
    - Add constraint to ensure weight is between 0 and 5
    - Add missing indexes for performance

  2. Schema Updates
    - Modify game.weight to use numeric(3,2)
    - Add weight range constraint
    - Add indexes for better query performance
*/

-- Update game weight to allow 2 decimal places and add constraint
DO $$ 
BEGIN
  -- Update column type if it doesn't match
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game' 
    AND column_name = 'weight' 
    AND data_type = 'numeric' 
    AND numeric_precision = 3 
    AND numeric_scale = 2
  ) THEN
    ALTER TABLE game
    ALTER COLUMN weight TYPE numeric(3,2);
  END IF;

  -- Add weight range constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_weight_range'
  ) THEN
    ALTER TABLE game
    ADD CONSTRAINT game_weight_range
    CHECK (weight >= 0 AND weight <= 5);
  END IF;
END $$;

-- Add indexes for better query performance if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_event_game_event_id'
  ) THEN
    CREATE INDEX idx_event_game_event_id ON event_game(event_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_event_game_game_id'
  ) THEN
    CREATE INDEX idx_event_game_game_id ON event_game(game_id);
  END IF;
END $$;