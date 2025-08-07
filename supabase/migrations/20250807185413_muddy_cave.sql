@@ .. @@
 CREATE TABLE IF NOT EXISTS profiles (
   id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
   username text UNIQUE,
   full_name text,
   avatar_url text,
+  avatar_shape text DEFAULT 'user',
+  avatar_foreground_color text DEFAULT '#4f46e5',
+  avatar_background_color text DEFAULT '#e0e7ff',
   is_admin boolean DEFAULT false,
   created_at timestamptz DEFAULT now(),
   updated_at timestamptz DEFAULT now()
 );