USE Equipe540193; 

INSERT INTO agencia (nome_ag, cidade) VALUES 

('Agência Centro Sobral', 'Sobral'),
('Agência Universitária UFC', 'Sobral'),
('Agência Beira Mar', 'Fortaleza'),
('Agência Cariri', 'Juazeiro do Norte');

INSERT INTO funcionario (matricula, nome_completo, senha, tipo_logradouro, nome_logradouro, numero, complemento, bairro, cidade, estado, cep, cargo, genero, data_nascimento, salario, fk_num_ag) VALUES

('F001', 'Carlos Augusto Alencar', '$2b$12$R9ZEXIPOWR...', 'Rua', 'Menino Deus', '450', 'Apto 101', 'Centro', 'Sobral', 'CE', '62010000', 'gerente', 'masculino', '1980-05-14', 6500.00, 1),
('F002', 'Ana Beatriz Souza', '$2b$12$KjH87YgVb...', 'Avenida', 'Dom José', '1200', NULL, 'Centro', 'Sobral', 'CE', '62011010', 'atendente', 'feminino', '1992-08-24', 2800.00, 1),
('F003', 'Mariana Lima Costa', '$2b$12$P09KjHnBg...', 'Rua', 'Anfrísio Alencar', '88', 'Casa B', 'Pedrinhas', 'Sobral', 'CE', '62015200', 'caixa', 'feminino', '1995-11-02', 2500.00, 1),

('F004', 'Roberto Kennedy Frota', '$2b$12$LkmJnhBgT...', 'Avenida', 'Universitária', '1000', 'Bloco de Engenharia', 'Mucambinho', 'Sobral', 'CE', '62040220', 'gerente', 'masculino', '1975-02-28', 8200.00, 2),
('F005', 'Dante Oliveira Silva', '$2b$12$MjnBgyTfc...', 'Rua', 'Quintino Bocaiúva', '341', NULL, 'Centro', 'Sobral', 'CE', '62010250', 'caixa', 'não-binário', '1998-06-15', 2300.00, 2),

('F006', 'Juliana Mendes Rocha', '$2b$12$XswZdeFrv...', 'Avenida', 'Abolição', '2500', 'Apto 1502', 'Meireles', 'Fortaleza', 'CE', '60165080', 'gerente', 'feminino', '1988-04-10', 7100.00, 3),
('F007', 'Marcos Paulo Vieira', '$2b$12$VfrBgtNhy...', 'Rua', 'Barão do Rio Branco', '900', NULL, 'Centro', 'Fortaleza', 'CE', '60025060', 'caixa', 'masculino', '2000-01-22', 2286.00, 3);

INSERT INTO dependente (fk_matricula, nome_completo, data_nascimento, parentesco) VALUES

('F001', 'Pedro Henrique Alencar', '2015-03-20', 'filho(a)'),
('F001', 'Carla Maria Alencar', '1983-09-12', 'cônjuge'),
('F004', 'Enzo Gabriel Frota', '2010-07-05', 'filho(a)'),
('F004', 'Valentina Frota', '2013-11-18', 'filho(a)'),
('F006', 'Maria Socorro Mendes', '1955-05-30', 'genitor(a)');

INSERT INTO cliente (cpf, nome_completo, rg, orgao_emissor, uf_rg, data_nascimento, tipo_logradouro, nome_logradouro, numero, complemento, bairro, cep, cidade, estado) VALUES

('11122233344', 'Francisco Evangelista Neto', '2005029123456', 'SSP', 'CE', '1990-01-15', 'Rua', 'Conselheiro Rodrigues', '12', NULL, 'Campo dos Velhos', '62030040', 'Sobral', 'CE'),
('55566677788', 'Maria Lindalva Pontes', '98029114755', 'SSP', 'CE', '1965-06-22', 'Rua', 'Idelfonso de Holanda', '555', 'Fundos', 'Centro', '62010210', 'Sobral', 'CE'),
('99988877766', 'Antônio José Albuquerque', '20010991288', 'SPOTC', 'CE', '1982-12-01', 'Avenida', 'Santos Dumont', '180', 'Torre A, Sala 4', 'Aldeota', '60150160', 'Fortaleza', 'CE'),
('22233344455', 'Amanda Cavalcante Ribeiro', '20081223499', 'SSP', 'CE', '1997-03-19', 'Rua', 'Dr. Ribeiro da Silva', '77', NULL, 'Junco', '62030500', 'Sobral', 'CE');

INSERT INTO telefone_cliente (fk_cpf, numero, descricao) VALUES

('11122233344', '(88) 99999-1111', 'celular1'),
('11122233344', '(88) 3611-2222', 'residencial'),
('55566677788', '(88) 98888-5555', 'celular1'),
('99988877766', '(85) 99111-9999', 'celular1'),
('99988877766', '(85) 3222-8888', 'comercial'),
('22233344455', '(88) 99666-4444', 'celular1');

INSERT INTO email_cliente (fk_cpf, email, descricao) VALUES

('11122233344', 'evangelista.neto@gmail.com', 'particular'),
('11122233344', 'neto.trabalho@empresa.com', 'comercial'),
('55566677788', 'lindalva_pontes@hotmail.com', 'particular'),
('99988877766', 'albuquerque.advocacia@outlook.com', 'comercial'),
('22233344455', 'amanda.ribeiro@aluno.ufc.br', 'particular');

INSERT INTO conta_bancaria (num_conta, senha, tipo_conta, fk_num_ag, fk_matricula_gerente, taxa_juros, limite_credito, data_aniversario_contrato) VALUES

(1001, '$2b$12$ZxEwQaZsD...', 'conta-corrente', 1, 'F001', NULL, NULL, '2026-01-10'),
(1002, '$2b$12$XsaWedCfr...', 'poupança', 1, 'F001', 0.50, NULL, NULL),
(1003, '$2b$12$VfBgNhJuM...', 'conta especial', 2, 'F004', NULL, 3000.00, NULL),
(1004, '$2b$12$MkiUjhYtg...', 'conta-corrente', 3, 'F006', NULL, NULL, '2026-03-15'),
(1005, '$2b$12$PoiUytRew...', 'conta especial', 1, 'F001', NULL, 5000.00, NULL);

INSERT INTO titularidade (fk_num_conta, fk_cpf_cliente, titularidade) VALUES

(1001, '11122233344', '1º Titular'), 
(1002, '55566677788', '1º Titular'),
(1002, '11122233344', '2º Titular'), 
(1003, '22233344455', '1º Titular'), 
(1004, '99988877766', '1º Titular'), 
(1005, '11122233344', '1º Titular'); 

INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, data_hora, valor) VALUES

(1, 1001, 'depósito', '2026-05-10 10:00:00', 2000.00),
(2, 1001, 'saque', '2026-06-02 14:30:00', 450.00),
(3, 1001, 'pagamento', '2026-06-08 09:15:00', 500.00),

INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, data_hora, valor) VALUES

(1, 1002, 'depósito', '2026-01-20 08:00:00', 5000.00),
(2, 1002, 'depósito', '2026-06-05 16:00:00', 150.00), 

INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, data_hora, valor) VALUES

(1, 1003, 'depósito', '2026-05-01 11:00:00', 800.00),
(2, 1003, 'PIX', '2026-05-28 22:10:00', 2000.00), 

INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, data_hora, valor) VALUES

(1, 1004, 'depósito', '2026-03-16 14:00:00', 15000.00),
(2, 1004, 'transferência', '2026-04-02 10:30:00', 2500.00),

INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, data_hora, valor) VALUES

(1, 1005, 'depósito', '2026-06-07 12:00:00', 400.00), 
(2, 1005, 'saque', '2026-06-09 15:00:00', 50.00);     