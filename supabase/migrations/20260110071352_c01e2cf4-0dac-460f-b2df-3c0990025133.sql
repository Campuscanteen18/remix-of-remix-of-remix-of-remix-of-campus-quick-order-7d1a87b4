-- Add a category column (text) to store category names directly
-- This allows storing categories like 'lunch', 'snacks', 'breakfast' without requiring UUID references

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'snacks';

-- Update existing items: if category_id is null, set category to 'snacks'
UPDATE public.menu_items 
SET category = 'snacks' 
WHERE category IS NULL;