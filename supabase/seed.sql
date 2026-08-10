-- Sample seed data for development/testing
-- Run manually after migrations in a dev environment

-- Sample stores (Jakarta area coordinates as examples)
INSERT INTO public.stores (store_code, name, address, latitude, longitude, radius_meters, status)
VALUES
  ('ST001', 'Store Alpha', 'Jl. Sudirman No. 1, Jakarta', -6.2088, 106.8456, 50, 'active'),
  ('ST002', 'Store Beta', 'Jl. Thamrin No. 10, Jakarta', -6.1944, 106.8229, 75, 'active'),
  ('ST003', 'Store Gamma', 'Jl. Gatot Subroto No. 5, Jakarta', -6.2297, 106.8300, 50, 'active')
ON CONFLICT (store_code) DO NOTHING;

-- Sample rewards (probabilities should sum to ~1.0)
INSERT INTO public.rewards (name, value, probability, status)
SELECT * FROM (VALUES
  ('Small Voucher', 'Rp 10.000', 0.5000::NUMERIC, 'active'),
  ('Medium Voucher', 'Rp 25.000', 0.3000::NUMERIC, 'active'),
  ('Large Voucher', 'Rp 50.000', 0.1500::NUMERIC, 'active'),
  ('Grand Prize', 'Rp 100.000', 0.0500::NUMERIC, 'active')
) AS v(name, value, probability, status)
WHERE NOT EXISTS (SELECT 1 FROM public.rewards LIMIT 1);
