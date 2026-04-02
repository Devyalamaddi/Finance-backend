INSERT INTO roles(name) VALUES ('viewer') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles(name) VALUES ('analyst') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles(name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;
