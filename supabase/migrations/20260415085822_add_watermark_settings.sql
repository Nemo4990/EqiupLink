/*
  # Add Watermark Settings

  ## Summary
  Enable parts suppliers and equipment suppliers to customize watermark settings
  for their uploaded photos.

  ## New Tables
  - `watermark_settings`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `enabled` (boolean) - Whether to apply watermarks
    - `text` (text) - Watermark text (e.g., business name)
    - `position` (text) - Position: top-left, top-right, bottom-left, bottom-right, center
    - `opacity` (numeric) - Opacity: 0-1
    - `font_size` (integer) - Font size in pixels
    - `color` (text) - Hex color code
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ## Security
  - Enable RLS on `watermark_settings` table
  - Users can only manage their own watermark settings
*/

CREATE TABLE IF NOT EXISTS public.watermark_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false,
  text text DEFAULT '',
  position text DEFAULT 'bottom-right',
  opacity numeric DEFAULT 0.7 CHECK (opacity >= 0 AND opacity <= 1),
  font_size integer DEFAULT 24 CHECK (font_size > 0),
  color text DEFAULT '#FFFFFF',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_watermark_settings_user_id ON public.watermark_settings(user_id);

ALTER TABLE public.watermark_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watermark settings"
  ON public.watermark_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watermark settings"
  ON public.watermark_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watermark settings"
  ON public.watermark_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watermark settings"
  ON public.watermark_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
