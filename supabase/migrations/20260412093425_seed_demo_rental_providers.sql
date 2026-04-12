/*
  # Seed Demo Rental Providers and Equipment Listings

  Creates 4 demo rental provider accounts and ~30 realistic equipment rental
  listings across major machine types common in Ethiopian construction:
  excavators, bulldozers, wheel loaders, motor graders, dump trucks, cranes, compactors.

  All marked is_demo=true for admin management.
*/

DO $$
DECLARE
  r1 uuid := 'c0000003-0003-0000-0000-000000000001';
  r2 uuid := 'c0000003-0003-0000-0000-000000000002';
  r3 uuid := 'c0000003-0003-0000-0000-000000000003';
  r4 uuid := 'c0000003-0003-0000-0000-000000000004';
BEGIN

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES
    (r1, 'abay.rentals@demo.equiplink.et',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (r2, 'omo.equipment@demo.equiplink.et',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (r3, 'baro.hire@demo.equiplink.et',      '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (r4, 'tekeze.machines@demo.equiplink.et','', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, name, email, role, phone, location, bio, is_approved, is_demo, contact_phone, contact_email, contact_complete, subscription_tier, is_verified, wallet_balance)
  VALUES
    (r1, 'Abay Heavy Equipment Rentals', 'abay.rentals@demo.equiplink.et',   'rental_provider', '+251116601001', 'Addis Ababa', 'Premier heavy equipment rental company with a fleet of 40+ machines. Serving Addis Ababa and all regional states.', true, true, '+251116601001', 'abay.rentals@demo.equiplink.et',   true, 'pro',  true, 0),
    (r2, 'Omo Equipment Hire',          'omo.equipment@demo.equiplink.et',  'rental_provider', '+251116601002', 'Hawassa',     'Southern Ethiopia equipment rental specialists. CAT and Komatsu fleet serving SNNPR, Oromia and surrounding areas.',   true, true, '+251116601002', 'omo.equipment@demo.equiplink.et',  true, 'pro',  true, 0),
    (r3, 'Baro Construction Equipment', 'baro.hire@demo.equiplink.et',      'rental_provider', '+251116601003', 'Jimma',       'Western Ethiopia equipment hire. Specialising in road construction and agriculture machinery rentals.',              true, true, '+251116601003', 'baro.hire@demo.equiplink.et',      true, 'free', true, 0),
    (r4, 'Tekeze Machinery Leasing',    'tekeze.machines@demo.equiplink.et','rental_provider', '+251116601004', 'Mekelle',     'Northern Ethiopia machine leasing. Modern fleet including Liebherr cranes and CAT earthmoving equipment.',             true, true, '+251116601004', 'tekeze.machines@demo.equiplink.et',true, 'free', false,0)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- EQUIPMENT RENTAL LISTINGS
  -- ============================================================
  INSERT INTO public.equipment_rentals (provider_id, machine_model, machine_type, brand, year, hourly_rate, daily_rate, location, description, is_available, is_demo, image_url)
  VALUES

  -- Abay (r1) – Addis Ababa
  (r1, '330D L',        'excavator',    'Caterpillar', 2019, 2800, 22000, 'Addis Ababa',         'CAT 330D L excavator, 30-tonne class. Ideal for building foundation and road excavation. GPS tracking fitted. Experienced operator available.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r1, 'PC300-8',       'excavator',    'Komatsu',     2020, 2600, 20500, 'Addis Ababa',         'Komatsu PC300-8 excavator, fully serviced. Hydraulic thumb attachment available. Fuel included in daily rate.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r1, 'D6T XL',        'bulldozer',    'Caterpillar', 2018, 3200, 25000, 'Addis Ababa',         'CAT D6T XL with 6-way blade. Road sub-base and clearing work. Available for long-term hire at negotiated rates.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r1, '966M XE',       'wheel_loader', 'Caterpillar', 2021, 2200, 17500, 'Addis Ababa',         'CAT 966M XE wheel loader with high-lift configuration. 5.7 m3 bucket. Excellent for quarry and warehouse work.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r1, '14M',           'motor_grader', 'Caterpillar', 2017, 2400, 19000, 'Addis Ababa',         'CAT 14M grader, all-wheel drive. ERA-approved for federal road projects. Operator included. Works in all regions.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r1, 'LTM 1100-4.2',  'crane',        'Liebherr',    2018, 4500, 36000, 'Addis Ababa',         'Liebherr 100-tonne telescopic mobile crane. Fully certified. Outrigger mats included. Experienced Liebherr-trained operator.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r1, 'EC360B',        'excavator',    'Volvo',       2019, 2700, 21500, 'Addis Ababa',         'Volvo EC360B, 36-tonne. Eco mode saves 15% fuel. Full service history maintained by Volvo CE dealer.', false, true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r1, 'A40G',          'dump_truck',   'Volvo',       2020, 1800, 14500, 'Addis Ababa',         'Volvo A40G articulated dump truck, 40-tonne payload. Low ground pressure tyres. Excellent for soft site conditions.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),

  -- Omo (r2) – Hawassa
  (r2, 'ZX330-5G',      'excavator',    'Hitachi',     2021, 2650, 21000, 'Hawassa',             'Hitachi ZX330-5G. Pre-emission compliant for all Ethiopian sites. CCTV camera system fitted. Operator available.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r2, 'D65PX-17',      'bulldozer',    'Komatsu',     2019, 3000, 23500, 'Hawassa',             'Komatsu D65PX-17 with low-ground-pressure configuration. Suitable for swampy SNNPR terrain and paddy field levelling.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r2, 'WA470-6',       'wheel_loader', 'Komatsu',     2020, 2100, 16800, 'Hawassa',             'Komatsu WA470-6, 4.5 m3 bucket. Used at Hawassa Industrial Park. Regular service records available.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r2, 'GD655-5',       'motor_grader', 'Komatsu',     2018, 2300, 18500, 'Hawassa',             'Komatsu GD655-5 grader with ripper. Serving road maintenance contracts in SNNPR. Minimum 3-day hire.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r2, 'BW213D-5',      'compactor',    'Bomag',       2021, 1400, 11200, 'Hawassa',             'Bomag BW213D-5 single-drum vibratory roller. 13-tonne operating weight. GPS compaction documentation available.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r2, 'PC200-8',       'excavator',    'Komatsu',     2020, 2100, 16500, 'Adama',               'Komatsu PC200-8 based in Adama. Available for Oromia region projects. Fuel not included.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r2, 'DX380LC-5',     'excavator',    'Doosan',      2019, 2500, 19800, 'Hawassa',             'Doosan DX380LC-5, excellent condition. Recent undercarriage replacement. 2-year contract preferred.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r2, 'FH16 8x4',      'dump_truck',   'Volvo',       2020, 950,  7800,  'Hawassa',             'Volvo FH16 rigid dump truck, 20 m3 body. Used on highway projects. Driver and insurance included.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),

  -- Baro (r3) – Jimma
  (r3, '850K',          'bulldozer',    'John Deere',  2018, 2900, 22500, 'Jimma',               'John Deere 850K dozer. Recently overhauled engine. Ideal for coffee estate land clearing in Western Ethiopia.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r3, '624K',          'wheel_loader', 'John Deere',  2019, 1950, 15500, 'Jimma',               'JD 624K, 4.0 m3 general purpose bucket. Used on Jimma road project. Available immediately.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r3, 'CX300C',        'excavator',    'Case',        2020, 2400, 19000, 'Jimma',               'Case CX300C excavator. Thumb and quick coupler available. Serviced by Case dealer in Addis Ababa.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r3, '821G',          'wheel_loader', 'Case',        2021, 1900, 15000, 'Jimma',               'Case 821G wheel loader, 5-year-warranty machine. Low hours 3,200. Excellent for irrigation project earthworks.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r3, 'BW 190 AD-5',   'compactor',    'Bomag',       2020, 1300, 10500, 'Jimma',               'Bomag BW190AD tandem roller. 9-tonne. Asphalt finishing quality. Available for road maintenance crews.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r3, 'RT100',         'dump_truck',   'ISUZU',       2019, 800,  6500,  'Jimma',               'ISUZU construction tipper, 10 m3 body. Local operator included. Ideal for aggregate and soil hauling.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),

  -- Tekeze (r4) – Mekelle
  (r4, 'R 926 LC',      'excavator',    'Liebherr',    2020, 3100, 24500, 'Mekelle',             'Liebherr R 926 LC, 26-tonne. Excellent for Tigray quarry and mining operations. Operator with Liebherr factory training.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r4, 'PR 756',        'bulldozer',    'Liebherr',    2019, 3500, 27500, 'Mekelle',             'Liebherr PR 756 Litronic dozer with LiDAT telematics. Powerful and fuel-efficient for rocky northern terrain.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r4, 'L 586',         'wheel_loader', 'Liebherr',    2021, 2300, 18500, 'Mekelle',             'Liebherr L 586 wheel loader, 5.5 m3 bucket. Used on MIDROC mining projects. Top condition.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r4, 'LTM 1060-3.1',  'crane',        'Liebherr',    2018, 3800, 30000, 'Mekelle',             'Liebherr 60-tonne all-terrain crane. Serving construction and telecom tower erection in northern Ethiopia.', true,  true, 'https://images.pexels.com/photos/1797430/pexels-photo-1797430.jpeg'),
  (r4, 'PC400-8',       'excavator',    'Komatsu',     2018, 3000, 23800, 'Mekelle',             'Komatsu PC400-8 mining-spec excavator. 40-tonne. Good for deep foundation and dam construction.', false, true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg'),
  (r4, '336D2 XE',      'excavator',    'Caterpillar', 2022, 2900, 23000, 'Addis Ababa',         'CAT 336D2 XE hybrid excavator. 15% lower fuel consumption. Available in Addis for large infrastructure projects.', true,  true, 'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg');

END $$;
