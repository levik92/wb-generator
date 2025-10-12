-- Ensure RPC functions are executable by authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.admin_update_user_tokens(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_block(uuid, boolean) TO authenticated;