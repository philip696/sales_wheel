-- Events: rewards and spin history are now scoped to an "event" (e.g. a
-- promo period, a trade show, a specific campaign) instead of being global.
--
-- Existing rewards/spins predate this concept, so on migrate we create a
-- single "General" event and backfill every existing reward onto it, then
-- require event_id going forward.

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_status ON public.events(status);

-- Backfill: one "General" event to own all pre-existing rewards.
INSERT INTO public.events (name, description, status)
VALUES ('General', 'Auto-created to hold rewards that existed before events were introduced.', 'active');

ALTER TABLE public.rewards
  ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

UPDATE public.rewards
SET event_id = (SELECT id FROM public.events WHERE name = 'General' LIMIT 1)
WHERE event_id IS NULL;

ALTER TABLE public.rewards
  ALTER COLUMN event_id SET NOT NULL;

CREATE INDEX idx_rewards_event_id ON public.rewards(event_id);

-- spins.event_id is denormalized (rather than derived via rewards.event_id)
-- so that pending/rejected spins with no reward_id are still attributable
-- to the event they were spun under, and so a reward can later be moved or
-- deleted without rewriting history. Nullable: historical spins that
-- predate this column have no event.
ALTER TABLE public.spins
  ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX idx_spins_event_id ON public.spins(event_id);

-- events RLS: everyone authenticated can see active events (needed to pick
-- a wheel to spin on); admins see and manage all.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_read_active_events"
  ON public.events FOR SELECT
  USING (auth.role() = 'authenticated' AND (status = 'active' OR public.is_admin()));

CREATE POLICY "admin_manage_events"
  ON public.events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());