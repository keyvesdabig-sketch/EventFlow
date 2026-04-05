-- RLS aktivieren
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Helper-Funktion: prüft ob der aktuelle User Owner ist
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM persons
    WHERE user_id = auth.uid()
    AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper-Funktion: gibt die person_id des aktuellen Users zurück
CREATE OR REPLACE FUNCTION my_person_id()
RETURNS UUID AS $$
  SELECT id FROM persons WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PERSONS: Owner sieht alle, Freelancer nur sich selbst
CREATE POLICY "owner_all_persons" ON persons
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_own_person" ON persons
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- PRODUCTION_TEMPLATES: nur Owner
CREATE POLICY "owner_all_templates" ON production_templates
  FOR ALL TO authenticated
  USING (is_owner());

-- EVENTS: Owner sieht alle; Freelancer sieht Events wo sie eine Buchung haben
CREATE POLICY "owner_all_events" ON events
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_booked_events" ON events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      JOIN bookings b ON b.role_id = r.id
      WHERE r.event_id = events.id
      AND b.person_id = my_person_id()
      AND b.status = 'confirmed'
    )
  );

-- ROLES: Owner sieht alle; Freelancer sieht Roles in ihren Events
CREATE POLICY "owner_all_roles" ON roles
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_event_roles" ON roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN roles r2 ON r2.event_id = e.id
      JOIN bookings b ON b.role_id = r2.id
      WHERE e.id = roles.event_id
      AND b.person_id = my_person_id()
      AND b.status = 'confirmed'
    )
  );

-- BOOKINGS: Owner sieht alle; Freelancer sieht + updated eigene Bookings
CREATE POLICY "owner_all_bookings" ON bookings
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_own_bookings_read" ON bookings
  FOR SELECT TO authenticated
  USING (person_id = my_person_id());

CREATE POLICY "freelancer_own_bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (person_id = my_person_id())
  WITH CHECK (person_id = my_person_id());
