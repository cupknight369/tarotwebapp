-- Generate a random UUID for the user
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  -- The password is 'password123'
  v_encrypted_pw TEXT := crypt('tester', gen_salt('bf'));
BEGIN

  -- 1. Insert the user into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'shane@cktarot.cards',
    v_encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name": "Shane", "last_name": "Tester"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- 2. Link an identity so the user can actually log in
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    format('{"sub": "%s", "email": "shane@cktarot.cards"}', v_user_id)::jsonb,
    'email',
    v_user_id,
    NOW(),
    NOW(),
    NOW()
  );

END $$;
