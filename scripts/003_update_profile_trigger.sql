-- Update the profile trigger to handle Google OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    )
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Give new users 100 welcome credits
  INSERT INTO public.credits (user_id, amount, reason, type)
  VALUES (NEW.id, 100, 'Welcome bonus', 'bonus');
  
  RETURN NEW;
END;
$$;
