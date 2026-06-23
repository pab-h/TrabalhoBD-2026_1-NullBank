-- ==========================================
-- 1. CRIAÇÃO DAS VISÕES E PROCEDURES
-- ==========================================

-- RF16.1: Visão de Contas por Gerente
CREATE VIEW v_contas_por_gerente AS
SELECT 
    f.matricula AS gerente_matricula,
    f.nome_completo AS gerente_nome,
    cb.num_conta,
    cb.tipo_conta,
    cb.saldo,
    c.cpf AS cliente_cpf,
    c.nome_completo AS cliente_nome,
    t.titularidade
FROM funcionario f
INNER JOIN conta_bancaria cb ON f.matricula = cb.fk_matricula_gerente
INNER JOIN titularidade t ON cb.num_conta = t.fk_num_conta
INNER JOIN cliente c ON t.fk_cpf_cliente = c.cpf;

-- RF16.2: Visão de Extrato Bancário Dinâmico
CREATE OR REPLACE VIEW v_extrato_transacoes AS
SELECT 
    fk_num_conta AS num_conta,
    num_transacao,
    tipo_transacao,
    data_hora,
    valor
FROM transacao;

-- RF10: Stored Procedure para Transferências
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

-- cole as triggers aqui, antes da secção de testes!

-- -----------------------------------------------------
-- RF11: Trigger para atualização automática de saldo
-- -----------------------------------------------------
DELIMITER //

CREATE TRIGGER trg_atualiza_saldo_apos_transacao
AFTER INSERT ON transacao
FOR EACH ROW
BEGIN
    -- Verifica se a transação deve retirar dinheiro (e se o valor é positivo)
    IF NEW.tipo_transacao IN ('saque', 'pagamento') THEN
        UPDATE conta_bancaria 
        SET saldo = saldo - NEW.valor 
        WHERE num_conta = NEW.fk_num_conta;
        
    -- Para depósitos, estornos ou transferências/PIX (onde o sinal já é tratado pela Procedure)
    ELSE
        UPDATE conta_bancaria 
        SET saldo = saldo + NEW.valor 
        WHERE num_conta = NEW.fk_num_conta;
    END IF;
END //

DELIMITER ;

-- ==========================================
-- 2. TESTES E CONSULTAS
-- ==========================================

-- Testar a Visão de Contas por Gerente (Exemplo com o gerente F001)
SELECT * FROM v_contas_por_gerente WHERE matricula_gerente = 'F001';

-- Testar a Visão de Extrato Bancário (Exemplo com a conta 1001)
SELECT * FROM v_extrato_transacoes WHERE num_conta = 1001;

-- Testar a Execução da Transferência (Transferindo 50.00 via PIX)
CALL sp_executar_transferencia(1001, 1002, 50.00, 'PIX');

-- Voltar a ver o extrato para garantir que a transferência aparece
SELECT * FROM v_extrato_transacoes WHERE num_conta = 1001;