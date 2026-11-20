-- Keep profile audit timestamps server-managed and synchronize
-- auth.users.last_sign_in_at into profiles.last_login_at.
--
-- The historical create_profile_on_login trigger function was created after
-- last_login_at was restored, but no auth.users UPDATE trigger was attached.
-- The live on_auth_user_created trigger only handles INSERT via handle_new_user.

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'user';
      NEW.email := NULL;
      NEW.created_at := now();
      NEW.updated_at := now();
      NEW.last_login_at := NULL;
    ELSE
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.role IS DISTINCT FROM OLD.role
         OR NEW.email IS DISTINCT FROM OLD.email
         OR NEW.created_at IS DISTINCT FROM OLD.created_at
         OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at THEN
        RAISE EXCEPTION 'id, role, email, created_at and last_login_at are managed by the authentication system'
          USING ERRCODE = '42501';
      END IF;

      NEW.updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_sensitive_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER guard_profile_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_sensitive_fields();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    locale,
    role,
    created_at,
    updated_at,
    last_login_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'ar'),
    'user',
    now(),
    now(),
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    locale = COALESCE(public.profiles.locale, EXCLUDED.locale, 'ar'),
    last_login_at = COALESCE(EXCLUDED.last_login_at, public.profiles.last_login_at),
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_profile_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, last_login_at)
  VALUES (NEW.id, NEW.email, NEW.last_sign_in_at)
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = COALESCE(EXCLUDED.last_login_at, public.profiles.last_login_at),
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_profile_on_login() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_last_sign_in_at ON auth.users;
CREATE TRIGGER on_auth_user_last_sign_in_at
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL)
  EXECUTE FUNCTION public.create_profile_on_login();
