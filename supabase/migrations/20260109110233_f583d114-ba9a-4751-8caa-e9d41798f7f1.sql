-- Update Janardhan's role from student to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '9c480892-6265-43c1-967f-ef1e9b6be716';