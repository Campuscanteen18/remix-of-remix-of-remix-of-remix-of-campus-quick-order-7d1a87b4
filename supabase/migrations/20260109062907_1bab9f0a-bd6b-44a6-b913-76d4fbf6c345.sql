-- Insert admin role for user bjanardhan618@gmail.com
INSERT INTO public.user_roles (user_id, campus_id, role)
VALUES (
  'aee55394-0a17-48b1-8793-eaec29098f5f',
  '86460363-0706-4602-a811-26d76a9c2515',
  'admin'
)
ON CONFLICT (user_id, campus_id, role) DO NOTHING;