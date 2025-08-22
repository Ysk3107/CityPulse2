-- Create rewards catalog table
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cost INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('digital', 'physical', 'experience', 'discount')),
  image_url TEXT,
  stock_quantity INTEGER DEFAULT -1, -- -1 means unlimited
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reward redemptions table
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  redemption_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  credits_awarded INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_type, achievement_name)
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Rewards policies (read-only for users)
CREATE POLICY "Anyone can view active rewards" ON public.rewards FOR SELECT TO authenticated USING (is_active = true);

-- Reward redemptions policies
CREATE POLICY "Users can view their own redemptions" ON public.reward_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create redemptions" ON public.reward_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view all achievements" ON public.user_achievements FOR SELECT TO authenticated USING (true);

-- Insert sample rewards
INSERT INTO public.rewards (title, description, cost, category, image_url) VALUES
('Coffee Shop Discount', '10% off at participating local coffee shops', 50, 'discount', '/placeholder.svg?height=200&width=200'),
('City Park Pass', 'Free entry to city parks for one month', 100, 'experience', '/placeholder.svg?height=200&width=200'),
('CityPulse T-Shirt', 'Official CityPulse community t-shirt', 200, 'physical', '/placeholder.svg?height=200&width=200'),
('Digital Badge', 'Special community contributor badge for your profile', 25, 'digital', '/placeholder.svg?height=200&width=200'),
('Local Business Voucher', '$10 voucher for local businesses', 150, 'discount', '/placeholder.svg?height=200&width=200'),
('Community Event Ticket', 'Free ticket to next community event', 75, 'experience', '/placeholder.svg?height=200&width=200');
