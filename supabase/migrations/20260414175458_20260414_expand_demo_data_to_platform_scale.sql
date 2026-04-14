/*
  # Expand Demo Data to Platform Scale

  Creates realistic demo data that fills the platform:
  - 1000+ mechanics across Ethiopian cities
  - 250+ suppliers with diverse parts inventory
  
  1. Demo Mechanics (1000+)
    - Distributed across Ethiopian cities
    - Various specializations
    - Realistic ratings and availability

  2. Demo Suppliers (250+)
    - Distributed across Ethiopia
    - 15-25 parts per supplier
    - Photo URLs for each listing

  3. Security
    - All marked is_demo=true for easy toggling
*/

DO $$
DECLARE
  mechanic_count int := 1000;
  supplier_count int := 250;
  current_mechanic_id uuid;
  current_supplier_id uuid;
  city_idx int;
  brand_idx int;
  
  cities text[] := ARRAY[
    'Addis Ababa', 'Dire Dawa', 'Hawassa', 'Mekelle', 'Bahir Dar', 
    'Gondar', 'Jimma', 'Adama', 'Modjo', 'Djibouti City',
    'Kombolcha', 'Desie', 'Woldia', 'Debre Markos', 'Assosa',
    'Gambela', 'Jijiga', 'Arba Minch', 'Yirgalem', 'Shashamene'
  ];
  
  brands text[] := ARRAY[
    'Caterpillar', 'Komatsu', 'Volvo', 'Hitachi', 'Liebherr',
    'John Deere', 'ISUZU', 'Doosan', 'New Holland', 'Case'
  ];
  
  part_types text[] := ARRAY[
    'Hydraulic Pump', 'Filter Kit', 'Seal Kit', 'Hose Assembly',
    'Engine Gasket', 'Transmission Fluid', 'Spark Plug Set',
    'Drive Belt', 'Bearing Set', 'Valve Assembly',
    'Coupling', 'Motor Mount', 'Air Filter', 'Fuel Injector',
    'Control Valve', 'Pressure Gauge', 'Relief Valve', 'Check Valve'
  ];
  
  part_categories text[] := ARRAY[
    'Hydraulics', 'Engine Parts', 'Electrical', 'Transmission', 
    'Cooling System', 'Fuel System', 'Seals & Gaskets'
  ];
  
  i int;
  j int;
  part_idx int;
  part_price numeric;
  
BEGIN

  FOR i IN 1..mechanic_count LOOP
    current_mechanic_id := gen_random_uuid();
    city_idx := ((i - 1) % array_length(cities, 1)) + 1;
    brand_idx := ((i - 1) % array_length(brands, 1)) + 1;
    
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      current_mechanic_id,
      'demo.mechanic.' || i || '@equiplink.et',
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
      contact_phone, contact_email, contact_complete, subscription_tier, is_verified, wallet_balance
    )
    VALUES (
      current_mechanic_id,
      'Demo Mechanic ' || i,
      'demo.mechanic.' || i || '@equiplink.et',
      'mechanic',
      '+251' || LPAD((911000000 + i)::text, 9, '0'),
      cities[city_idx],
      'Demo ' || brands[brand_idx] || ' equipment specialist. ' || (8 + (i % 12))::text || ' years of field experience.',
      true,
      true,
      '+251' || LPAD((911000000 + i)::text, 9, '0'),
      'demo.mechanic.' || i || '@equiplink.et',
      true,
      CASE WHEN (i % 3 = 0) THEN 'pro' ELSE 'free' END,
      (i % 10) < 7,
      0
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.mechanic_profiles (
      user_id, specializations, years_experience, service_area,
      supported_brands, hourly_rate, is_available, rating, total_reviews, is_verified
    )
    VALUES (
      current_mechanic_id,
      ARRAY['engine', 'hydraulics', 'electrical']::text[],
      8 + (i % 12),
      cities[city_idx] || ' Region',
      ARRAY[brands[brand_idx], brands[((brand_idx % array_length(brands, 1)) + 1)]],
      800 + (i % 1200),
      (i % 3) > 0,
      4.3 + ((i % 7) * 0.1),
      5 + (i % 60),
      (i % 10) < 7
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
  
  FOR i IN 1..supplier_count LOOP
    current_supplier_id := gen_random_uuid();
    city_idx := ((i - 1) % array_length(cities, 1)) + 1;
    brand_idx := ((i - 1) % array_length(brands, 1)) + 1;
    
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      current_supplier_id,
      'demo.supplier.' || i || '@equiplink.et',
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
      contact_phone, contact_email, contact_complete, subscription_tier, is_verified, wallet_balance
    )
    VALUES (
      current_supplier_id,
      'Demo Supplier ' || i,
      'demo.supplier.' || i || '@equiplink.et',
      'supplier',
      '+251' || LPAD((922000000 + i)::text, 9, '0'),
      cities[city_idx],
      'Authorized ' || brands[brand_idx] || ' parts distributor. Quality guaranteed, fast delivery.',
      true,
      true,
      '+251' || LPAD((922000000 + i)::text, 9, '0'),
      'demo.supplier.' || i || '@equiplink.et',
      true,
      'pro',
      (i % 5) < 4,
      0
    )
    ON CONFLICT (id) DO NOTHING;
    
    FOR j IN 1..20 LOOP
      part_idx := ((i + j - 2) % array_length(part_types, 1)) + 1;
      part_price := (1500 + ((i + j) * 150)) + (((i * j) % 5000) * 10);
      
      INSERT INTO public.parts_listings (
        id, supplier_id, part_name, category, price, stock_quantity,
        is_active, is_demo, description, image_urls
      )
      VALUES (
        gen_random_uuid(),
        current_supplier_id,
        part_types[part_idx] || ' - ' || brands[brand_idx] || ' ' || LPAD(j::text, 3, '0'),
        part_categories[(part_idx % array_length(part_categories, 1)) + 1],
        part_price,
        5 + (j % 50),
        (j % 4) > 0,
        true,
        'Genuine ' || brands[brand_idx] || ' ' || part_types[part_idx] || '. Original packaging, in stock.',
        ARRAY[
          'https://images.pexels.com/photos/6172507/pexels-photo-6172507.jpeg?auto=compress&cs=tinysrgb&w=400',
          'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=400'
        ]::text[]
      );
    END LOOP;
  END LOOP;

END $$;
