-- Add persistent gold balance to characters
ALTER TABLE "Character"
ADD COLUMN "gold" INTEGER NOT NULL DEFAULT 0;
