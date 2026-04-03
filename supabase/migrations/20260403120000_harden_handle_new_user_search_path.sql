-- Fix function_search_path_mutable (Supabase linter 0011): SECURITY DEFINER must use a fixed search_path.
-- Removes dead "set search_path" after return; sets search_path on the function itself.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$function$;
