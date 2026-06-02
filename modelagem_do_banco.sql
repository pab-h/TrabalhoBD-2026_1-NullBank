DROP DATABASE IF EXISTS NullBank;

CREATE DATABASE NullBank;

USE NullBank;

CREATE TABLE agencia (
    num_ag        INT            AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(256)   NOT NULL,
    salario_total DECIMAL(12, 2) DEFAULT 0,
    cidade        VARCHAR(256)   NOT NULL
);
