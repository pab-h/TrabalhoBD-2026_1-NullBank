DROP DATABASE IF EXISTS Equipe540193;

CREATE DATABASE Equipe540193;

USE Equipe540193;

CREATE TABLE agencia (

    num_ag        INT            AUTO_INCREMENT PRIMARY KEY,
    nome_ag          VARCHAR(256)   NOT NULL,
    sal_total DECIMAL(12, 2) DEFAULT 0,
    cidade        VARCHAR(256)   NOT NULL

);

CREATE TABLE funcionario (

    matricula       VARCHAR(20)  NOT NULL,
    nome_completo   VARCHAR(150) NOT NULL,
    senha           VARCHAR(255) NOT NULL,
    tipo_logradouro VARCHAR(20)  NOT NULL,
    nome_logradouro VARCHAR(100) NOT NULL,
    numero          VARCHAR(10)  NOT NULL,
    complemento     VARCHAR(50),
    bairro          VARCHAR(50)  NOT NULL,
    cidade          VARCHAR(100) NOT NULL,
    estado          CHAR(2)      NOT NULL,
    cep             CHAR(8)      NOT NULL,

    cargo  ENUM('gerente', 'atendente', 'caixa')        NOT NULL,
    genero ENUM('masculino', 'feminino', 'não-binário') NOT NULL,

    data_nascimento DATE           NOT NULL,
    salario         DECIMAL(10, 2) NOT NULL,
    fk_num_ag       INT            NOT NULL,

    PRIMARY KEY (matricula),
    FOREIGN KEY (fk_num_ag) REFERENCES agencia(num_ag)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_salario_base CHECK (salario >= 2286.00)

) ENGINE=InnoDB;

CREATE TABLE dependente (

    id_dependente   INT          AUTO_INCREMENT,
    fk_matricula    VARCHAR(20)  NOT NULL,
    nome_completo   VARCHAR(150) NOT NULL,
    data_nascimento DATE         NOT NULL,

    parentesco ENUM('filho(a)', 'cônjuge', 'genitor(a)') NOT NULL,

    PRIMARY KEY (id_dependente),
    FOREIGN KEY (fk_matricula) REFERENCES funcionario(matricula)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_dependente_funcionario UNIQUE (fk_matricula, nome_completo)

) ENGINE=InnoDB;

CREATE TABLE cliente (

    cpf             CHAR(11)     NOT NULL,
    nome_completo   VARCHAR(150) NOT NULL,
    rg              VARCHAR(15)  NOT NULL,
    orgao_emissor   VARCHAR(10)  NOT NULL,
    uf_rg           CHAR(2)      NOT NULL,
    data_nascimento DATE         NOT NULL,
    tipo_logradouro VARCHAR(20)  NOT NULL,
    nome_logradouro VARCHAR(100) NOT NULL,
    numero          VARCHAR(10)  NOT NULL,
    complemento     VARCHAR(50),
    bairro          VARCHAR(50)  NOT NULL,
    cep             CHAR(8)      NOT NULL,
    cidade          VARCHAR(100) NOT NULL,
    estado          CHAR(2)      NOT NULL,

    PRIMARY KEY (cpf)

) ENGINE=InnoDB;

CREATE TABLE telefone_cliente (
    id_telefone INT AUTO_INCREMENT,
    fk_cpf CHAR(11) NOT NULL,
    numero VARCHAR(15) NOT NULL,
    descricao VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_telefone),
    FOREIGN KEY (fk_cpf) REFERENCES cliente(cpf)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB;

CREATE TABLE email_cliente (

    id_email  INT          AUTO_INCREMENT,
    fk_cpf    CHAR(11)     NOT NULL,
    email     VARCHAR(254) NOT NULL, 
    descricao VARCHAR(30)  NOT NULL,

    PRIMARY KEY (id_email),
    FOREIGN KEY (fk_cpf) REFERENCES cliente(cpf)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB;

CREATE TABLE conta_bancaria (

    num_conta INT            NOT NULL,
    saldo     DECIMAL(15, 2) NOT NULL DEFAULT 0.00, 
    senha     VARCHAR(255)   NOT NULL,

    tipo_conta ENUM('conta-corrente', 'poupança', 'conta especial') NOT NULL,
    
    fk_num_ag            INT         NOT NULL,
    fk_matricula_gerente VARCHAR(20) NOT NULL,
    
    taxa_juros                DECIMAL(5, 2)  DEFAULT NULL, 
    limite_credito            DECIMAL(15, 2) DEFAULT NULL,
    data_aniversario_contrato DATE           DEFAULT NULL, 

    PRIMARY KEY (num_conta),
    FOREIGN KEY (fk_num_ag) REFERENCES agencia(num_ag)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (fk_matricula_gerente) REFERENCES funcionario(matricula)
        ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB;

CREATE TABLE titularidade (

    fk_num_conta   INT      NOT NULL,
    fk_cpf_cliente CHAR(11) NOT NULL,
    
    titularidade ENUM('1º Titular', '2º Titular') NOT NULL,
    
    PRIMARY KEY (fk_num_conta, fk_cpf_cliente),
    FOREIGN KEY (fk_num_conta) REFERENCES conta_bancaria(num_conta)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (fk_cpf_cliente) REFERENCES cliente(cpf)
        ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB;

CREATE TABLE transacao (

    num_transacao INT NOT NULL, 
    fk_num_conta  INT NOT NULL,

    tipo_transacao ENUM('saque', 'depósito', 'pagamento', 'estorno', 'transferência', 'PIX') NOT NULL,
    
    data_hora DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor     DECIMAL(15, 2) NOT NULL,
    
    PRIMARY KEY (fk_num_conta, num_transacao), 
    FOREIGN KEY (fk_num_conta) REFERENCES conta_bancaria(num_conta)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- RF16.1: Visão de Contas por Gerente
-- -----------------------------------------------------
CREATE OR REPLACE VIEW v_contas_por_gerente AS
SELECT 
    c.fk_matricula_gerente AS matricula_gerente,
    c.num_conta,
    c.tipo_conta,
    c.saldo,
    t.fk_cpf_cliente AS cpf_cliente,
    cli.nome_completo AS nome_cliente,
    t.titularidade
FROM conta_bancaria c
JOIN titularidade t ON c.num_conta = t.fk_num_conta
JOIN cliente cli ON t.fk_cpf_cliente = cli.cpf;

-- -----------------------------------------------------
-- RF16.2: Visão de Extrato Bancário Dinâmico
-- -----------------------------------------------------
CREATE OR REPLACE VIEW v_extrato_transacoes AS
SELECT 
    fk_num_conta AS num_conta,
    num_transacao,
    tipo_transacao,
    data_hora,
    valor
FROM transacao;

-- -----------------------------------------------------
-- RF10: Stored Procedure para Transferências
-- -----------------------------------------------------
DELIMITER //

CREATE PROCEDURE sp_executar_transferencia(
    IN p_conta_origem INT,
    IN p_conta_destino INT,
    IN p_valor DECIMAL(15,2),
    IN p_tipo_transacao VARCHAR(20) -- 'transferência' ou 'PIX'
)
BEGIN
    DECLARE v_prox_num_origem INT;
    DECLARE v_prox_num_destino INT;

    -- Iniciar a transação de forma atômica
    START TRANSACTION;

    -- Calcular o próximo num_transacao para a conta de origem
    SELECT COALESCE(MAX(num_transacao), 0) + 1 INTO v_prox_num_origem 
    FROM transacao WHERE fk_num_conta = p_conta_origem;

    -- Inserir o registo de saída (débito)
    INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, valor) 
    VALUES (v_prox_num_origem, p_conta_origem, p_tipo_transacao, -p_valor);

    -- Calcular o próximo num_transacao para a conta de destino
    SELECT COALESCE(MAX(num_transacao), 0) + 1 INTO v_prox_num_destino 
    FROM transacao WHERE fk_num_conta = p_conta_destino;

    -- Inserir o registo de entrada (crédito)
    INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, valor) 
    VALUES (v_prox_num_destino, p_conta_destino, p_tipo_transacao, p_valor);

    -- Confirmar as operações
    COMMIT;
END //

DELIMITER ;