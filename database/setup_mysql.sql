-- Crear base de datos y usuario para HumanLink (MySQL 8+)
-- Ejecutar como root: mysql -u root -p < database/setup_mysql.sql

CREATE DATABASE IF NOT EXISTS humanlink
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'humanlink'@'localhost' IDENTIFIED BY 'humanlink2026';
GRANT ALL PRIVILEGES ON humanlink.* TO 'humanlink'@'localhost';
FLUSH PRIVILEGES;
