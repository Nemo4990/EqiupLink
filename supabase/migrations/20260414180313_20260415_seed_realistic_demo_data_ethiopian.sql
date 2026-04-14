/*
  # Seed Realistic Demo Data with Ethiopian Names & Authentic Parts

  Replaces generic demo data with:
  - Real Ethiopian names
  - Authentic CAT, Komatsu, Volvo, Hitachi machinery parts with real part numbers
  - Real addresses in Ethiopian cities
  - Market-realistic pricing (ETB currency)
*/

DO $$
DECLARE
  mechanic_count int := 1000;
  supplier_count int := 250;
  
  ethiopian_first_names text[] := ARRAY[
    'Abebe', 'Yonas', 'Girma', 'Dawit', 'Mulugeta', 'Tesfaye', 'Solomon', 'Kebede',
    'Hailu', 'Biruk', 'Ermias', 'Fekadu', 'Tadesse', 'Bekele', 'Haile', 'Mengistu',
    'Alemu', 'Worku', 'Getachew', 'Demissie', 'Tadele', 'Assefa', 'Dejene', 'Negash',
    'Teshome', 'Gizaw', 'Mesfin', 'Lemma', 'Dereje', 'Kassahun', 'Zegeye', 'Tibebe',
    'Desalegn', 'Bahiru', 'Abera', 'Surafel', 'Melaku', 'Tamrat', 'Gashaw', 'Mekuria',
    'Asrat', 'Temesgen', 'Tibebu', 'Fantaye', 'Wondwosen', 'Demessa', 'Muluken', 'Teferra'
  ];

  ethiopian_last_names text[] := ARRAY[
    'Tadessa', 'Bekele', 'Haile', 'Mengistu', 'Alemu', 'Worku', 'Getachew', 'Demissie',
    'Tadele', 'Assefa', 'Dejene', 'Negash', 'Teshome', 'Gizaw', 'Mesfin', 'Lemma',
    'Dereje', 'Kassahun', 'Zegeye', 'Tibebe', 'Desalegn', 'Bahiru', 'Abera', 'Surafel',
    'Melaku', 'Tamrat', 'Gashaw', 'Mekuria', 'Asrat', 'Temesgen', 'Fantaye', 'Wondwosen',
    'Muluken', 'Teferra', 'Aregawi', 'Tekle', 'Gebremedhin', 'Gebreyohannes', 'Teklu', 'Wolde',
    'Gebre', 'Alemayehu', 'Bedane', 'Tsegaye', 'Kiros', 'Asfaw', 'Belay', 'Taddese'
  ];

  cat_parts text[] := ARRAY[
    '320-0726|CAT Engine Oil Filter|8500',
    '263-1530|CAT Hydraulic Pump Main|185000',
    '7Y-0729|CAT Transmission Seal Kit|42000',
    '262-1528|CAT Gear Pump Hydraulic|156000',
    '1R-0732|CAT Fuel Filter|6200',
    '1C-4004|CAT Engine Gasket Set|28500',
    '8Y-3362|CAT Drive Belt|12400',
    '4W-7618|CAT Bearing Assembly|34600',
    '1P-5650|CAT Control Valve Spool|87500',
    '3B-6789|CAT Hydraulic Hose DN32|18900',
    '2R-8450|CAT Relief Valve Cartridge|52300',
    '4P-3280|CAT Check Valve Assembly|31200',
    '6W-9321|CAT Pressure Gauge|7800',
    '5T-1248|CAT Flexible Coupling|43500',
    '3M-5678|CAT Motor Mount Rubber|22100',
    '7L-4562|CAT Air Filter Element|5600',
    '2N-8901|CAT Fuel Injector|65000',
    '8K-3456|CAT Transmission Fluid 20L|3200'
  ];

  komatsu_parts text[] := ARRAY[
    '600-411-1342|Komatsu Engine Oil Filter|9200',
    '705-56-34170|Komatsu Main Hydraulic Pump|195000',
    '203-60-61211|Komatsu Transmission Seal Kit|45600',
    '705-56-36090|Komatsu Gear Pump|165000',
    '600-411-1360|Komatsu Fuel Filter|6800',
    '6114-31-1801|Komatsu Gasket Set|31200',
    '07000-80480|Komatsu Drive Belt|13400',
    '07000-02168|Komatsu Bearing Set|37200',
    '708-33-05130|Komatsu Control Valve|92400',
    '07010-01805|Komatsu Hydraulic Hose|19800',
    '708-33-05140|Komatsu Relief Valve|56000',
    '08911-98006|Komatsu Check Valve|33800',
    '300-63-31300|Komatsu Pressure Gauge|8400',
    '07000-02320|Komatsu Flexible Coupling|46200',
    '07000-04640|Komatsu Motor Mount|23800',
    '600-411-1340|Komatsu Air Filter|6100',
    '6278-11-3200|Komatsu Fuel Injector|68500',
    '08980-11200|Komatsu Transmission Fluid 20L|3500'
  ];

  volvo_parts text[] := ARRAY[
    '11110286|Volvo Oil Filter Element|8800',
    '14564414|Volvo Main Pump Hydraulic|178000',
    '14505842|Volvo Seal Kit Transmission|41300',
    '11032341|Volvo Pump Assembly|159000',
    '14644165|Volvo Fuel Filter|7100',
    '3848444|Volvo Engine Gasket Set|29400',
    '8113801|Volvo Fan Belt|11200',
    '14514618|Volvo Roller Bearing|35900',
    '14511962|Volvo Proportional Valve|89300',
    '11139951|Volvo Hose Assembly|17600',
    '14585370|Volvo Pressure Relief Valve|54200',
    '11702788|Volvo Pilot Check Valve|32100',
    '8114670|Volvo Pressure Gauge|8100',
    '11702410|Volvo Shaft Coupling|44800',
    '11038650|Volvo Vibration Isolator|21900',
    '11139950|Volvo Air Filter Cartridge|5900',
    '20748261|Volvo Fuel Injector Unit|66200',
    '20758556|Volvo Hydraulic Oil 20L|3400'
  ];

  hitachi_parts text[] := ARRAY[
    '4329957|Hitachi Oil Filter|8900',
    '4419319|Hitachi Main Hydraulic Pump|187000',
    '4438175|Hitachi Seal Kit|43600',
    '4655625|Hitachi Pump Assembly|162000',
    '4329970|Hitachi Fuel Filter|6900',
    '4436873|Hitachi Gasket Set|30100',
    '4329975|Hitachi Drive Belt|12100',
    '4401450|Hitachi Bearing Kit|36400',
    '4436874|Hitachi Control Valve|90500',
    '4440190|Hitachi Hose Pipe|18300',
    '4436875|Hitachi Relief Valve|55100',
    '4438976|Hitachi Check Valve|32800',
    '4442561|Hitachi Manometer|8200',
    '4438980|Hitachi Coupling|45600',
    '4329980|Hitachi Engine Mount|22700',
    '4329985|Hitachi Air Filter|6000',
    '4436740|Hitachi Fuel Injector|67100',
    '4655645|Hitachi Hydraulic Fluid 20L|3450'
  ];

  ethiopian_cities text[] := ARRAY[
    'Addis Ababa', 'Dire Dawa', 'Hawassa', 'Mekelle', 'Bahir Dar',
    'Gondar', 'Jimma', 'Adama', 'Modjo', 'Arba Minch',
    'Desie', 'Kombolcha', 'Woldia', 'Debre Markos', 'Yirgalem'
  ];

  ethiopian_streets text[] := ARRAY[
    'Addis Road', 'Nefas Silk', 'Bole Road', 'Kazanchis', 'Meskel Square',
    'Sheraton Road', 'Potters Lane', 'Piazza', 'Bab Dima', 'Churchill Avenue',
    'Summit Road', 'Hilton Avenue', 'Atlas Road', 'Bambis Road', 'Arada Road'
  ];

  first_name text;
  last_name text;
  city text;
  street text;
  current_id uuid;
  i int;
  j int;
  part_idx int;
  part_str text;
  part_number text;
  part_name text;
  part_price numeric;
  brand_choice int;
  
BEGIN

  FOR i IN 1..mechanic_count LOOP
    current_id := gen_random_uuid();
    first_name := ethiopian_first_names[(i % array_length(ethiopian_first_names, 1)) + 1];
    last_name := ethiopian_last_names[(i % array_length(ethiopian_last_names, 1)) + 1];
    city := ethiopian_cities[(i % array_length(ethiopian_cities, 1)) + 1];
    street := ethiopian_streets[(i % array_length(ethiopian_streets, 1)) + 1];

    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      current_id,
      lower(first_name || '.' || last_name || i || '@demo.equiplink.et'),
      '',
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (
      id, name, email, role, phone, location, bio, is_approved, is_demo,
      contact_phone, contact_email, contact_complete, subscription_tier, is_verified, wallet_balance, contact_address
    )
    VALUES (
      current_id,
      first_name || ' ' || last_name,
      lower(first_name || '.' || last_name || i || '@demo.equiplink.et'),
      'mechanic',
      '+251' || LPAD((911000000 + i)::text, 9, '0'),
      city,
      'Expert heavy equipment technician with proven track record.',
      true,
      true,
      '+251' || LPAD((911000000 + i)::text, 9, '0'),
      lower(first_name || '.' || last_name || '@demo.equiplink.et'),
      true,
      CASE WHEN (i % 3 = 0) THEN 'pro' ELSE 'free' END,
      (i % 10) < 7,
      0,
      street || ' Street, ' || city || ', Ethiopia'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.mechanic_profiles (
      user_id, specializations, years_experience, service_area,
      supported_brands, hourly_rate, is_available, rating, total_reviews, is_verified, contact_address
    )
    VALUES (
      current_id,
      ARRAY['engine', 'hydraulics', 'electrical']::text[],
      8 + (i % 12),
      city || ' Region',
      ARRAY[CASE WHEN (i % 4 = 0) THEN 'Caterpillar' WHEN (i % 4 = 1) THEN 'Komatsu' WHEN (i % 4 = 2) THEN 'Volvo' ELSE 'Hitachi' END],
      800 + (i % 1200),
      (i % 3) > 0,
      4.3 + ((i % 7) * 0.1),
      5 + (i % 60),
      (i % 10) < 7,
      street || ' Street, ' || city || ', Ethiopia'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;

  FOR i IN 1..supplier_count LOOP
    current_id := gen_random_uuid();
    first_name := ethiopian_first_names[(i % array_length(ethiopian_first_names, 1)) + 1];
    last_name := ethiopian_last_names[(i % array_length(ethiopian_last_names, 1)) + 1];
    city := ethiopian_cities[(i % array_length(ethiopian_cities, 1)) + 1];
    street := ethiopian_streets[(i % array_length(ethiopian_streets, 1)) + 1];
    brand_choice := i % 4;

    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      current_id,
      lower(first_name || '.' || last_name || 'sup' || i || '@demo.equiplink.et'),
      '',
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (
      id, name, email, role, phone, location, bio, is_approved, is_demo,
      contact_phone, contact_email, contact_complete, subscription_tier, is_verified, wallet_balance, contact_address
    )
    VALUES (
      current_id,
      first_name || ' ' || last_name || ' Parts Supply',
      lower(first_name || '.' || last_name || 'sup' || i || '@demo.equiplink.et'),
      'supplier',
      '+251' || LPAD((922000000 + i)::text, 9, '0'),
      city,
      'Authorized machinery parts distributor. Quality guaranteed with warranty.',
      true,
      true,
      '+251' || LPAD((922000000 + i)::text, 9, '0'),
      lower(first_name || '.' || last_name || '@demo.equiplink.et'),
      true,
      'pro',
      (i % 5) < 4,
      0,
      street || ' Street, ' || city || ', Ethiopia'
    )
    ON CONFLICT (id) DO NOTHING;

    FOR j IN 1..20 LOOP
      part_idx := ((i + j - 2) % 18) + 1;

      IF brand_choice = 0 THEN
        part_str := cat_parts[part_idx];
      ELSIF brand_choice = 1 THEN
        part_str := komatsu_parts[part_idx];
      ELSIF brand_choice = 2 THEN
        part_str := volvo_parts[part_idx];
      ELSE
        part_str := hitachi_parts[part_idx];
      END IF;

      part_number := split_part(part_str, '|', 1);
      part_name := split_part(part_str, '|', 2);
      part_price := split_part(part_str, '|', 3)::numeric * (1 + (((i * j) % 5) * 0.05));

      INSERT INTO public.parts_listings (
        id, supplier_id, part_name, part_number, category, price, stock_quantity,
        is_active, is_demo, description, image_urls
      )
      VALUES (
        gen_random_uuid(),
        current_id,
        part_name,
        part_number,
        CASE j % 7
          WHEN 0 THEN 'Hydraulics'
          WHEN 1 THEN 'Engine Parts'
          WHEN 2 THEN 'Electrical'
          WHEN 3 THEN 'Transmission'
          WHEN 4 THEN 'Seals & Gaskets'
          WHEN 5 THEN 'Cooling System'
          ELSE 'Fuel System'
        END,
        part_price,
        5 + ((i * j) % 45),
        (j % 4) > 0,
        true,
        'Genuine OEM part. In stock, ready for immediate delivery.',
        ARRAY[
          'https://images.pexels.com/photos/6172507/pexels-photo-6172507.jpeg?auto=compress&cs=tinysrgb&w=400',
          'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=400'
        ]::text[]
      );
    END LOOP;
  END LOOP;

END $$;
