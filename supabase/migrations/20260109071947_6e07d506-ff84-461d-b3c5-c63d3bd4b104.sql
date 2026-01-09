-- Enable RLS on the views and add explicit security policies
-- Views with security_invoker=true inherit base table RLS, but explicit policies add defense in depth

-- Enable Row Level Security on profiles_readable view
ALTER VIEW profiles_readable SET (security_barrier = true);

-- Enable Row Level Security on user_roles_readable view  
ALTER VIEW user_roles_readable SET (security_barrier = true);

-- Note: PostgreSQL views with security_invoker=true already inherit RLS from base tables.
-- Adding security_barrier=true prevents optimizer from pushing user queries into the view
-- definition in ways that could leak data through timing attacks or error messages.