CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS community_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geom        geometry(Point, 4326) NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  validated   boolean NOT NULL DEFAULT false
);

-- Reports are always read by area, never by id.
CREATE INDEX IF NOT EXISTS community_reports_geom_idx
  ON community_reports USING gist (geom);

-- Aggregation decays old reports, so recent ones are read far more often.
CREATE INDEX IF NOT EXISTS community_reports_created_at_idx
  ON community_reports (created_at DESC);
