-- Fix search_path security issue
DROP FUNCTION IF EXISTS update_user_storage(UUID, BIGINT);

CREATE OR REPLACE FUNCTION update_user_storage(
  p_user_id UUID,
  p_size_delta BIGINT
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET total_storage_used = GREATEST(0, total_storage_used + p_size_delta)
  WHERE id = p_user_id;
END;
$$;