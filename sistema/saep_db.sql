-- Script de demonstração SAEP. Executar no MySQL Workbench.
-- Todos os registros são fictícios; os CPFs de exemplo permanecem NULL.
CREATE DATABASE IF NOT EXISTS clinica_veterinaria
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clinica_veterinaria;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tutores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NULL,
  telefone VARCHAR(30) NULL,
  cpf_cifrado VARBINARY(32) NULL,
  cpf_iv BINARY(12) NULL,
  cpf_tag BINARY(16) NULL,
  cpf_hash CHAR(64) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tutores_cpf_hash (cpf_hash)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id INT UNSIGNED NOT NULL,
  nome VARCHAR(80) NOT NULL,
  especie VARCHAR(50) NOT NULL,
  raca VARCHAR(80) NULL,
  data_nascimento DATE NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pets_tutor (tutor_id),
  CONSTRAINT fk_pets_tutor FOREIGN KEY (tutor_id)
    REFERENCES tutores (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agendamentos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pet_id INT UNSIGNED NOT NULL,
  data_hora DATETIME NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agendamento_pet_data (pet_id, data_hora),
  KEY idx_agendamentos_data (data_hora),
  CONSTRAINT fk_agendamentos_pet FOREIGN KEY (pet_id)
    REFERENCES pets (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Senha fictícia comum para as contas de avaliação: Mudar123!
-- Troque as credenciais antes de qualquer uso real.
INSERT IGNORE INTO usuarios (id, nome, username, senha_hash) VALUES
  (1, 'Usuário Administrador', 'admin', '$2a$10$H2wS20Z0tLc4eJmu5GMszus0IOEp1xhvzC42rf5a/7HMyXxgFg7cW'),
  (2, 'Usuário Recepção', 'recepcao', '$2a$10$H2wS20Z0tLc4eJmu5GMszus0IOEp1xhvzC42rf5a/7HMyXxgFg7cW'),
  (3, 'Usuário Veterinária', 'vet', '$2a$10$H2wS20Z0tLc4eJmu5GMszus0IOEp1xhvzC42rf5a/7HMyXxgFg7cW');

INSERT IGNORE INTO tutores (id, nome, email, telefone, cpf_cifrado, cpf_iv, cpf_tag, cpf_hash) VALUES
  (1, 'Tutor Fictício 01', 'tutor01@example.test', '0000000001', NULL, NULL, NULL, NULL),
  (2, 'Tutor Fictício 02', 'tutor02@example.test', '0000000002', NULL, NULL, NULL, NULL),
  (3, 'Tutor Fictício 03', 'tutor03@example.test', '0000000003', NULL, NULL, NULL, NULL);

INSERT IGNORE INTO pets (id, tutor_id, nome, especie, raca, data_nascimento) VALUES
  (1, 1, 'Pet Exemplo 01', 'Cão', 'Sem raça definida', '2020-05-10'),
  (2, 2, 'Pet Exemplo 02', 'Gato', 'Sem raça definida', '2021-08-15'),
  (3, 3, 'Pet Exemplo 03', 'Cão', 'Poodle', '2019-03-22');

INSERT IGNORE INTO agendamentos (id, pet_id, data_hora) VALUES
  (1, 1, '2027-06-20 09:00:00'),
  (2, 2, '2027-06-20 10:00:00'),
  (3, 3, '2027-06-21 11:00:00');
