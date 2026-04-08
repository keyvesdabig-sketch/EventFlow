-- Gibt alle bestätigten Crew-Mitglieder (Name, Phone, Rolle) für ein Event zurück.
-- SECURITY DEFINER: läuft als postgres-User, umgeht RLS auf persons.
CREATE OR REPLACE FUNCTION get_confirmed_crew(p_event_id uuid)
RETURNS TABLE (
  person_id   uuid,
  person_name text,
  phone       text,
  role_title  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id         AS person_id,
    p.name       AS person_name,
    p.phone      AS phone,
    r.title      AS role_title
  FROM bookings b
  JOIN roles    r ON b.role_id = r.id
  JOIN persons  p ON b.person_id = p.id
  WHERE r.event_id = p_event_id
    AND b.status = 'confirmed'
  ORDER BY r.created_at;
END;
$$;
