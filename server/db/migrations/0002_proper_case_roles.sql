ALTER TYPE role_enum RENAME VALUE 'SUPERADMIN' TO 'Superadmin';
ALTER TYPE role_enum RENAME VALUE 'ADMIN' TO 'Admin';
ALTER TYPE role_enum RENAME VALUE 'REVIEWER' TO 'Reviewer';
ALTER TYPE role_enum RENAME VALUE 'EDITOR' TO 'Editor';
ALTER TYPE role_enum RENAME VALUE 'USER' TO 'User';

UPDATE "role" SET name = 'Superadmin' WHERE name = 'SUPERADMIN';
UPDATE "role" SET name = 'Admin' WHERE name = 'ADMIN';
UPDATE "role" SET name = 'Reviewer' WHERE name = 'REVIEWER';
UPDATE "role" SET name = 'Editor' WHERE name = 'EDITOR';
UPDATE "role" SET name = 'User' WHERE name = 'USER';
