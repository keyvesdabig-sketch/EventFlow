-- Erlaubt einem authentifizierten User, die eigene (noch nicht verknüpfte) persons-Row
-- per E-Mail-Match zu lesen — nötig für den ersten Schritt in linkPersonToUser().
CREATE POLICY "allow_self_link_select" ON persons
  FOR SELECT TO authenticated
  USING ((user_id IS NULL) AND (email = (auth.jwt() ->> 'email'::text)));
