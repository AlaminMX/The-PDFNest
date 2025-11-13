-- Grant admin role to PDFAdmin account
INSERT INTO public.user_roles (user_id, role)
VALUES ('fdd382e7-7a1b-477c-9797-835b358659dd', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;