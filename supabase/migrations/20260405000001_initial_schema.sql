-- Persons (Owner + Freelancer)
CREATE TABLE persons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL UNIQUE,
  photo_url   TEXT,
  skills      TEXT[] NOT NULL DEFAULT '{}',
  notes       TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL CHECK (role IN ('owner', 'freelancer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Production Templates
CREATE TABLE production_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  phases              JSONB NOT NULL DEFAULT '[]',
  role_templates      JSONB NOT NULL DEFAULT '[]',
  default_venue_info  TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID REFERENCES production_templates(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  phases       JSONB NOT NULL DEFAULT '[]',
  venue        JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','booking','confirmed','live','completed','cancelled')),
  documents    JSONB NOT NULL DEFAULT '[]',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Roles (innerhalb eines Events)
CREATE TABLE roles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  assigned_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  person_id      UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'sent'
                 CHECK (status IN ('sent','confirmed','declined')),
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at   TIMESTAMPTZ,
  decline_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für häufige Queries
CREATE INDEX idx_roles_event_id ON roles(event_id);
CREATE INDEX idx_bookings_role_id ON bookings(role_id);
CREATE INDEX idx_bookings_person_id ON bookings(person_id);
CREATE INDEX idx_persons_user_id ON persons(user_id);
CREATE INDEX idx_events_status ON events(status);
