-- Step 1: Remove the default value from the column to avoid casting issues.
ALTER TABLE public.profiles ALTER COLUMN plan_type DROP DEFAULT;

-- Step 2: Rename the old ENUM and create the new, correct one.
ALTER TYPE public.plan_type RENAME TO plan_type_old;
CREATE TYPE public.plan_type AS ENUM ('free', 'classic', 'pro');

-- Step 3: Alter the column to use the new type, converting old data.
ALTER TABLE public.profiles
ALTER COLUMN plan_type TYPE public.plan_type
USING replace(plan_type::text, '''', '')::public.plan_type;

-- Step 4: Drop the old ENUM type.
DROP TYPE public.plan_type_old;

-- Step 5: Re-add the default value using the new, correct type.
ALTER TABLE public.profiles ALTER COLUMN plan_type SET DEFAULT 'free';
