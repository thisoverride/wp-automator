-- Création de la base de données
CREATE DATABASE IF NOT EXISTS wordpress_manager;
USE wordpress_manager;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    type ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
    api_key_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

-- Table des clés API
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    consumer_key VARCHAR(255) NOT NULL,
    consumer_secret VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sites WordPress
CREATE TABLE IF NOT EXISTS wordpress_sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    user_id INT,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des containers
CREATE TABLE IF NOT EXISTS containers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255),
    logs TEXT,
    status ENUM('running', 'stopped', 'terminated') NOT NULL DEFAULT 'stopped',
    service VARCHAR(255),
    application_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES wordpress_sites(id)
);

-- Exemple d'insertion de données pour les utilisateurs
INSERT INTO users (username, password, type) VALUES
    ('admin', 'admin123', 'admin'),
    ('editor1', 'editor123', 'editor'),
    ('viewer1', 'viewer123', 'viewer');

-- Exemple d'insertion de données pour les clés API
INSERT INTO api_keys (consumer_key, consumer_secret) VALUES
    ('key123', 'secret123'),
    ('key456', 'secret456');

-- Exemple d'insertion de données pour les sites WordPress
INSERT INTO wordpress_sites (name, url, user_id, status) VALUES
    ('Site 1', 'http://site1.com', 1, 'active'),
    ('Site 2', 'http://site2.com', 2, 'inactive');

-- Exemple d'insertion de données pour les containers
INSERT INTO containers (description, logs, status, service, application_id) VALUES
    ('Container for Site 1', 'Log data for Site 1 container', 'running', 'wordpress', 1),
    ('Container for Site 2', 'Log data for Site 2 container', 'stopped', 'wordpress', 2);

-- Afficher la structure des tables
SHOW TABLES;

-- Afficher la structure de chaque table
SHOW COLUMNS FROM users;
SHOW COLUMNS FROM api_keys;
SHOW COLUMNS FROM wordpress_sites;
SHOW COLUMNS FROM containers;
