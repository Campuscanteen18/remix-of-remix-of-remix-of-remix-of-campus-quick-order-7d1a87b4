-- Create enum for days of week
CREATE TYPE public.day_of_week AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat');

-- Add available_days column to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN available_days public.day_of_week[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat']::public.day_of_week[];