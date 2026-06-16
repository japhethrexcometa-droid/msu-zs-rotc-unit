-- Pull-Out Requests table for tracking cadet pull-outs during training
CREATE TABLE IF NOT EXISTS pull_out_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id UUID NOT NULL REFERENCES users(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PULL-OUT', 'RETURNED')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  scanned_out_by UUID REFERENCES users(id),
  time_in TIMESTAMPTZ,
  returned_by UUID REFERENCES users(id),
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pull_out_status ON pull_out_requests(status);
CREATE INDEX IF NOT EXISTS idx_pull_out_cadet ON pull_out_requests(cadet_id);
CREATE INDEX IF NOT EXISTS idx_pull_out_created ON pull_out_requests(created_at DESC);

ALTER TABLE pull_out_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON pull_out_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON pull_out_requests FOR ALL TO anon USING (true) WITH CHECK (true);
