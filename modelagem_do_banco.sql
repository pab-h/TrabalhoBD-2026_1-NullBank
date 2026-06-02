DROP DATABASE IF EXISTS Equipe540193;

CREATE DATABASE Equipe540193;

USE Equipe540193;

CREATE TABLE agencia (
    num_ag        INT            AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(256)   NOT NULL,
    salario_total DECIMAL(12, 2) DEFAULT 0,
    cidade        VARCHAR(256)   NOT NULL
);
