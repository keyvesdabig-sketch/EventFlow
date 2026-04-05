-- Hinweis: user_id bleibt NULL – wird beim ersten Login verknüpft.
-- Erst via Supabase Dashboard die User erstellen, dann IDs hier eintragen.

-- Owner
INSERT INTO persons (name, email, phone, role, skills, notes)
VALUES (
  'Marco Berther',
  'marco@ehc-production.ch',
  '+41 79 000 00 01',
  'owner',
  '{}',
  'Inhaber'
);

-- Freelancer-Pool (EHC Chur Produktionsteam)
INSERT INTO persons (name, email, phone, role, skills, notes) VALUES
  ('Max Müller',    'max@crew.ch',    '+41 79 000 00 02', 'freelancer', ARRAY['camera'],        'Sony FX9 zertifiziert'),
  ('Lena Graf',     'lena@crew.ch',   '+41 79 000 00 03', 'freelancer', ARRAY['camera'],        ''),
  ('Sara Bauer',    'sara@crew.ch',   '+41 79 000 00 04', 'freelancer', ARRAY['audio'],         'DPA-Mikrofone'),
  ('Tom Keller',    'tom@crew.ch',    '+41 79 000 00 05', 'freelancer', ARRAY['vision_mixing'], ''),
  ('Urs Caflisch',  'urs@crew.ch',    '+41 79 000 00 06', 'freelancer', ARRAY['evs'],           'EVS LSM-VIA'),
  ('Anna Schmidt',  'anna@crew.ch',   '+41 79 000 00 07', 'freelancer', ARRAY['graphics'],      ''),
  ('Peter Huber',   'peter@crew.ch',  '+41 79 000 00 08', 'freelancer', ARRAY['rf_tech'],       '');

-- Beispiel-Template: NL2 Heimspiel EHC Chur
INSERT INTO production_templates (name, phases, role_templates, default_venue_info)
VALUES (
  'NL2 Heimspiel EHC Chur',
  '[
    {"name": "Rigging",   "defaultDurationHours": 4},
    {"name": "Rehearsal", "defaultDurationHours": 2},
    {"name": "Live",      "defaultDurationHours": 3}
  ]',
  '[
    {"title": "Kameramann 1",  "count": 1, "preferredPersonIds": []},
    {"title": "Kameramann 2",  "count": 1, "preferredPersonIds": []},
    {"title": "EVS-Operator",  "count": 1, "preferredPersonIds": []},
    {"title": "Toningenieur",  "count": 1, "preferredPersonIds": []},
    {"title": "Bildmischer",   "count": 1, "preferredPersonIds": []}
  ]',
  'Eissportzentrum Chur, Güterstrasse 5, 7000 Chur. Ü-Wagen: Eingang Nord, Tor B.'
);
