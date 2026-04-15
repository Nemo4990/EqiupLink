/*
  # Clear Demo Image URLs

  ## Summary
  Remove all existing image URLs from demo parts listings and equipment rentals
  to allow uploaded images to be displayed instead.

  ## Changes
  - Clear image_urls array from all demo parts listings
  - Clear image_url from all demo equipment rentals
  - Prepare demo listings for fresh uploaded images
*/

-- Clear image URLs from demo parts listings
UPDATE public.parts_listings
SET image_urls = NULL
WHERE is_demo = true;

-- Clear image URL from demo equipment rentals
UPDATE public.equipment_rentals
SET image_url = NULL
WHERE is_demo = true;
