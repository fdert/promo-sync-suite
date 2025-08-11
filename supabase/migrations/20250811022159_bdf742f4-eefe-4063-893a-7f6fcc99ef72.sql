-- Fix the missing created_at column in agency_members table
ALTER TABLE agency_members 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();