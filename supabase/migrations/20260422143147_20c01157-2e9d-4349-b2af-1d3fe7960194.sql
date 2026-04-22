
-- Profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  age INT,
  monthly_income NUMERIC,
  employment_type TEXT CHECK (employment_type IN ('student','salaried','self_employed')),
  has_existing_loans BOOLEAN DEFAULT false,
  onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Banks (public read)
CREATE TABLE public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  brand_color TEXT NOT NULL,
  loan_base_rate NUMERIC NOT NULL,         -- annual %
  loan_risk_premium NUMERIC NOT NULL,      -- additional % per risk tier
  min_score_required INT NOT NULL,         -- 0-100
  fd_rate NUMERIC NOT NULL,                -- annual %
  fd_min_amount NUMERIC NOT NULL DEFAULT 1000,
  fd_min_days INT NOT NULL DEFAULT 30,
  fd_max_days INT NOT NULL DEFAULT 1825,
  tagline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banks are public" ON public.banks FOR SELECT USING (true);

-- Loan applications
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks(id),
  amount NUMERIC NOT NULL,
  duration_days INT NOT NULL,
  purpose TEXT NOT NULL,
  interest_rate NUMERIC NOT NULL,         -- effective annual %
  repayment_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved','rejected','active','repaid')),
  credit_score INT NOT NULL,
  risk_category TEXT NOT NULL,
  decision_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own loans" ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own loans" ON public.loans FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX loans_user_idx ON public.loans(user_id, created_at DESC);
