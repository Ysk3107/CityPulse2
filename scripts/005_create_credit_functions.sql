-- Function to award credits and check for achievements
CREATE OR REPLACE FUNCTION public.award_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_type TEXT DEFAULT 'earned',
  p_related_report_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_total_credits INTEGER;
  user_reports_count INTEGER;
  user_votes_count INTEGER;
BEGIN
  -- Insert credit record
  INSERT INTO public.credits (user_id, amount, reason, type, related_report_id)
  VALUES (p_user_id, p_amount, p_reason, p_type, p_related_report_id);
  
  -- Get user's total credits
  SELECT COALESCE(SUM(amount), 0) INTO user_total_credits
  FROM public.credits
  WHERE user_id = p_user_id;
  
  -- Check for milestone achievements
  IF user_total_credits >= 100 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_type = 'credits' AND achievement_name = 'First 100'
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, description, credits_awarded)
    VALUES (p_user_id, 'credits', 'First 100', 'Earned your first 100 credits', 25);
    
    INSERT INTO public.credits (user_id, amount, reason, type)
    VALUES (p_user_id, 25, 'Achievement: First 100 credits', 'bonus');
  END IF;
  
  IF user_total_credits >= 500 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_type = 'credits' AND achievement_name = 'Credit Master'
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, description, credits_awarded)
    VALUES (p_user_id, 'credits', 'Credit Master', 'Earned 500+ credits', 50);
    
    INSERT INTO public.credits (user_id, amount, reason, type)
    VALUES (p_user_id, 50, 'Achievement: Credit Master', 'bonus');
  END IF;
  
  -- Check for reporting achievements
  SELECT COUNT(*) INTO user_reports_count
  FROM public.reports
  WHERE user_id = p_user_id;
  
  IF user_reports_count >= 5 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_type = 'reporting' AND achievement_name = 'Community Reporter'
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, description, credits_awarded)
    VALUES (p_user_id, 'reporting', 'Community Reporter', 'Submitted 5+ reports', 30);
    
    INSERT INTO public.credits (user_id, amount, reason, type)
    VALUES (p_user_id, 30, 'Achievement: Community Reporter', 'bonus');
  END IF;
  
  -- Check for voting achievements
  SELECT COUNT(*) INTO user_votes_count
  FROM public.report_votes
  WHERE user_id = p_user_id;
  
  IF user_votes_count >= 10 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_type = 'engagement' AND achievement_name = 'Active Voter'
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, description, credits_awarded)
    VALUES (p_user_id, 'engagement', 'Active Voter', 'Voted on 10+ reports', 20);
    
    INSERT INTO public.credits (user_id, amount, reason, type)
    VALUES (p_user_id, 20, 'Achievement: Active Voter', 'bonus');
  END IF;
END;
$$;

-- Function to redeem reward
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_user_id UUID,
  p_reward_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reward_cost INTEGER;
  user_credits INTEGER;
  redemption_id UUID;
  reward_stock INTEGER;
BEGIN
  -- Get reward cost and stock
  SELECT cost, stock_quantity INTO reward_cost, reward_stock
  FROM public.rewards
  WHERE id = p_reward_id AND is_active = true;
  
  IF reward_cost IS NULL THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;
  
  -- Check stock
  IF reward_stock = 0 THEN
    RAISE EXCEPTION 'Reward out of stock';
  END IF;
  
  -- Get user's total credits
  SELECT COALESCE(SUM(amount), 0) INTO user_credits
  FROM public.credits
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF user_credits < reward_cost THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Create redemption record
  INSERT INTO public.reward_redemptions (user_id, reward_id, credits_spent, redemption_code)
  VALUES (p_user_id, p_reward_id, reward_cost, 'RDM-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)))
  RETURNING id INTO redemption_id;
  
  -- Deduct credits
  INSERT INTO public.credits (user_id, amount, reason, type)
  VALUES (p_user_id, -reward_cost, 'Reward redemption: ' || (SELECT title FROM public.rewards WHERE id = p_reward_id), 'redeemed');
  
  -- Update stock if not unlimited
  IF reward_stock > 0 THEN
    UPDATE public.rewards
    SET stock_quantity = stock_quantity - 1
    WHERE id = p_reward_id;
  END IF;
  
  RETURN redemption_id;
END;
$$;
