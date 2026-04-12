/*
  # Seed Demo Mechanics — Ethiopia

  Creates realistic demo mechanic profiles based in Ethiopian cities.
  All accounts are marked is_demo=true so admins can toggle them.
  Inserts auth.users records first to satisfy the FK constraint on profiles.
*/

DO $$
DECLARE
  m1  uuid := 'a0000001-0001-0000-0000-000000000001';
  m2  uuid := 'a0000001-0001-0000-0000-000000000002';
  m3  uuid := 'a0000001-0001-0000-0000-000000000003';
  m4  uuid := 'a0000001-0001-0000-0000-000000000004';
  m5  uuid := 'a0000001-0001-0000-0000-000000000005';
  m6  uuid := 'a0000001-0001-0000-0000-000000000006';
  m7  uuid := 'a0000001-0001-0000-0000-000000000007';
  m8  uuid := 'a0000001-0001-0000-0000-000000000008';
  m9  uuid := 'a0000001-0001-0000-0000-000000000009';
  m10 uuid := 'a0000001-0001-0000-0000-000000000010';
  m11 uuid := 'a0000001-0001-0000-0000-000000000011';
  m12 uuid := 'a0000001-0001-0000-0000-000000000012';
BEGIN

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES
    (m1,  'abebe.tadesse@demo.equiplink.et',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m2,  'yonas.bekele@demo.equiplink.et',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m3,  'girma.haile@demo.equiplink.et',      '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m4,  'dawit.mengistu@demo.equiplink.et',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m5,  'mulugeta.alemu@demo.equiplink.et',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m6,  'tesfaye.worku@demo.equiplink.et',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m7,  'solomon.getachew@demo.equiplink.et', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m8,  'kebede.demissie@demo.equiplink.et',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m9,  'hailu.tadele@demo.equiplink.et',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m10, 'biruk.assefa@demo.equiplink.et',     '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m11, 'ermias.dejene@demo.equiplink.et',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
    (m12, 'fekadu.negash@demo.equiplink.et',    '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, name, email, role, phone, location, bio, is_approved, is_demo, contact_phone, contact_email, contact_complete, subscription_tier, is_verified, wallet_balance)
  VALUES
    (m1,  'Abebe Tadesse',    'abebe.tadesse@demo.equiplink.et',    'mechanic', '+251911234501', 'Addis Ababa', 'Senior CAT and Komatsu heavy equipment technician with 14 years experience on construction sites across Ethiopia.',      true, true, '+251911234501', 'abebe.tadesse@demo.equiplink.et',    true, 'pro',  true,  0),
    (m2,  'Yonas Bekele',     'yonas.bekele@demo.equiplink.et',     'mechanic', '+251911234502', 'Addis Ababa', 'Hydraulics and transmission specialist. Expert in Volvo EC and Hitachi ZX series excavators.',                         true, true, '+251911234502', 'yonas.bekele@demo.equiplink.et',     true, 'pro',  true,  0),
    (m3,  'Girma Haile',      'girma.haile@demo.equiplink.et',      'mechanic', '+251911234503', 'Dire Dawa',   'Diesel engine overhaul specialist. 11 years servicing John Deere and Case construction machinery.',                    true, true, '+251911234503', 'girma.haile@demo.equiplink.et',      true, 'free', true,  0),
    (m4,  'Dawit Mengistu',   'dawit.mengistu@demo.equiplink.et',   'mechanic', '+251911234504', 'Adama',       'Electrical systems and diagnostics. Certified Liebherr technician covering Oromia region.',                           true, true, '+251911234504', 'dawit.mengistu@demo.equiplink.et',   true, 'pro',  true,  0),
    (m5,  'Mulugeta Alemu',   'mulugeta.alemu@demo.equiplink.et',   'mechanic', '+251911234505', 'Hawassa',     'Undercarriage and track repair expert. Specialises in CAT D6, D7, D8 bulldozers for road construction.',              true, true, '+251911234505', 'mulugeta.alemu@demo.equiplink.et',   true, 'free', true,  0),
    (m6,  'Tesfaye Worku',    'tesfaye.worku@demo.equiplink.et',    'mechanic', '+251911234506', 'Mekelle',     'Hydraulics repair and hose fabrication. Services mining equipment across Tigray and Afar regions.',                   true, true, '+251911234506', 'tesfaye.worku@demo.equiplink.et',    true, 'pro',  true,  0),
    (m7,  'Solomon Getachew', 'solomon.getachew@demo.equiplink.et', 'mechanic', '+251911234507', 'Bahir Dar',   'Motor grader and road paver specialist. 9 years with ERA road construction projects in Amhara region.',               true, true, '+251911234507', 'solomon.getachew@demo.equiplink.et', true, 'free', false, 0),
    (m8,  'Kebede Demissie',  'kebede.demissie@demo.equiplink.et',  'mechanic', '+251911234508', 'Jimma',       'Agricultural machinery mechanic. Expert in combine harvesters, tractors and irrigation pumps in Western Ethiopia.',    true, true, '+251911234508', 'kebede.demissie@demo.equiplink.et',  true, 'free', false, 0),
    (m9,  'Hailu Tadele',     'hailu.tadele@demo.equiplink.et',     'mechanic', '+251911234509', 'Gondar',      'Crane and lifting equipment technician. Certified Liebherr and Tadano service engineer with 12 years experience.',     true, true, '+251911234509', 'hailu.tadele@demo.equiplink.et',     true, 'pro',  true,  0),
    (m10, 'Biruk Assefa',     'biruk.assefa@demo.equiplink.et',     'mechanic', '+251911234510', 'Addis Ababa', 'Komatsu factory-trained technician. Specialises in PC200, PC300 and WA series wheel loaders.',                        true, true, '+251911234510', 'biruk.assefa@demo.equiplink.et',     true, 'pro',  true,  0),
    (m11, 'Ermias Dejene',    'ermias.dejene@demo.equiplink.et',    'mechanic', '+251911234511', 'Adama',       'Pneumatics and air-brake systems specialist for dump trucks and articulated haulers. ISUZU and Hino certified.',      true, true, '+251911234511', 'ermias.dejene@demo.equiplink.et',    true, 'free', false, 0),
    (m12, 'Fekadu Negash',    'fekadu.negash@demo.equiplink.et',    'mechanic', '+251911234512', 'Addis Ababa', 'Multi-brand field service technician. Rapid-response breakdown coverage across Addis Ababa and surrounding towns.',   true, true, '+251911234512', 'fekadu.negash@demo.equiplink.et',    true, 'pro',  true,  0)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.mechanic_profiles (user_id, specializations, years_experience, service_area, supported_brands, hourly_rate, is_available, rating, total_reviews, is_verified)
  VALUES
    (m1,  ARRAY['engine','hydraulics','transmission'],              14, 'Addis Ababa, Central Ethiopia',   ARRAY['Caterpillar','Komatsu','Volvo'],                     1800, true,  4.9, 47, true),
    (m2,  ARRAY['hydraulics','transmission','electrical'],          10, 'Addis Ababa, Oromia',             ARRAY['Volvo','Hitachi','Doosan'],                          1600, true,  4.8, 31, true),
    (m3,  ARRAY['engine','transmission'],                           11, 'Dire Dawa, Harar, Somali Region', ARRAY['John Deere','Case','New Holland'],                   1200, true,  4.7, 22, true),
    (m4,  ARRAY['electrical','diagnostics','engine'],                9, 'Adama, Oromia',                   ARRAY['Liebherr','Caterpillar','Komatsu'],                  1400, true,  4.6, 18, true),
    (m5,  ARRAY['undercarriage','hydraulics','engine'],             12, 'Hawassa, SNNPR',                  ARRAY['Caterpillar','Komatsu','Doosan'],                    1300, false, 4.8, 27, true),
    (m6,  ARRAY['hydraulics','electrical'],                         10, 'Mekelle, Tigray, Afar',           ARRAY['Caterpillar','Liebherr','Atlas Copco'],              1500, true,  4.7, 15, true),
    (m7,  ARRAY['engine','transmission','hydraulics'],               9, 'Bahir Dar, Amhara Region',        ARRAY['Caterpillar','John Deere','Bomag'],                  1100, true,  4.5, 12, false),
    (m8,  ARRAY['engine','hydraulics'],                              8, 'Jimma, Welega, Western Ethiopia', ARRAY['John Deere','Massey Ferguson','New Holland'],        900,  true,  4.4, 9,  false),
    (m9,  ARRAY['hydraulics','electrical','engine'],                12, 'Gondar, North Amhara',            ARRAY['Liebherr','Tadano','Grove'],                         1700, true,  4.9, 33, true),
    (m10, ARRAY['engine','hydraulics','transmission'],              10, 'Addis Ababa, Central Ethiopia',   ARRAY['Komatsu','Caterpillar'],                             1600, true,  4.8, 29, true),
    (m11, ARRAY['pneumatics','electrical','engine'],                 7, 'Adama, Modjo, East Shewa',        ARRAY['ISUZU','Hino','Man','Sinotruk'],                     1000, true,  4.3, 8,  false),
    (m12, ARRAY['engine','hydraulics','electrical','transmission'], 15, 'Addis Ababa Metro Area',          ARRAY['Caterpillar','Komatsu','Volvo','Hitachi','Liebherr'],2000, true,  5.0, 61, true)
  ON CONFLICT (user_id) DO NOTHING;

END $$;
