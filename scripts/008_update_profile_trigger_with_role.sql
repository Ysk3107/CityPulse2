-- Update the profile creation trigger to include role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'citizen')
  );
  
  -- Give welcome bonus credits to new users
  INSERT INTO public.credits (user_id, amount, reason, type)
  VALUES (new.id, 100, 'Welcome bonus for joining CityPulse!', 'bonus');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
