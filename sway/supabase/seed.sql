-- SWAY Seed Data for Development
-- Creates test colleges and users for local development

-- Insert test colleges
insert into colleges (id, name, city, state, email_domains, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'IIT Delhi', 'Delhi', 'Delhi', ARRAY['iitd.ac.in', 'delhi.iit.ac.in'], true),
  ('22222222-2222-2222-2222-222222222222', 'St. Xavier''s Mumbai', 'Mumbai', 'Maharashtra', ARRAY['xaviers.edu', 'students.xaviers.edu'], true);

-- Note: Test users will be created via Supabase Auth signup flow in development
-- The following are placeholder profiles (actual auth.users must be created first via signInWithOtp)

-- Sample interests for testing
-- Common interests: ['Music', 'Movies', 'Coding', 'Sports', 'Gaming', 'Art', 'Reading', 'Travel', 'Food', 'Fitness']
