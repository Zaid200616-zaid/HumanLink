-- Reinicio limpio de la base humanlink (XAMPP — ejecutar como root)
-- PowerShell: Get-Content database\reset_database.sql | C:\xampp\mysql\bin\mysql.exe -u root

DROP DATABASE IF EXISTS humanlink;

CREATE DATABASE humanlink
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'humanlink'@'localhost' IDENTIFIED BY 'humanlink2026';
CREATE USER IF NOT EXISTS 'humanlink'@'127.0.0.1' IDENTIFIED BY 'humanlink2026';

GRANT ALL PRIVILEGES ON humanlink.* TO 'humanlink'@'localhost';
GRANT ALL PRIVILEGES ON humanlink.* TO 'humanlink'@'127.0.0.1';

ALTER USER 'humanlink'@'localhost' IDENTIFIED BY 'humanlink2026';
ALTER USER 'humanlink'@'127.0.0.1' IDENTIFIED BY 'humanlink2026';

FLUSH PRIVILEGES;
