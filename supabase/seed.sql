-- Seed: the four departments and the initial invite code.
-- IMPORTANT: change the invite code from the admin panel after first login.

insert into departments (name, slug) values
  ('Mekanik', 'mekanik'),
  ('Elektrik', 'elektrik'),
  ('Yazılım', 'yazilim'),
  ('Organizasyon', 'organizasyon')
on conflict (slug) do nothing;

insert into app_settings (id, invite_code)
values (1, 'RACING-2027')
on conflict (id) do nothing;
