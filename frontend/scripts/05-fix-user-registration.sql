-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table with error handling
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'staff'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- Update RLS policies for profiles to allow insertion during registration
DROP POLICY IF EXISTS "Enable insert for authentication users only" ON profiles;
CREATE POLICY "Enable insert for authentication users only" ON profiles
  FOR INSERT WITH CHECK (true);

-- Ensure the profiles table has the correct structure
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'staff';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
