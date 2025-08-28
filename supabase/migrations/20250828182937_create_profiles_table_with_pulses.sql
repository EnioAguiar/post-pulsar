-- 1. Create a custom type for the plans
CREATE TYPE public.plan_type AS ENUM (
    '''free''',
    '''basic''',
    '''pro'''
);

-- 2. Create the profiles table
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    plan_type public.plan_type DEFAULT '''free''' NOT NULL,
    monthly_pulses_remaining INTEGER DEFAULT 5 NOT NULL
);

-- 3. Add comments for clarity
COMMENT ON TABLE public.profiles IS '''Stores user-specific data like subscription plan and usage credits.''';
COMMENT ON COLUMN public.profiles.id IS '''References the user in auth.users.''';

-- 4. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 6. Create a function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
