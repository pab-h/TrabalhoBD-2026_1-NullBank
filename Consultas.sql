-- =========================================================================================
-- PARTE 1: VISÕES (VIEWS) E PROCEDURES
-- =========================================================================================

-- View para facilitar a listagem de contas que pertencem a cada gerente
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

-- View base para montar o histórico/extrato das contas
CREATE OR REPLACE VIEW v_extrato_transacoes AS
SELECT 
    fk_num_conta AS num_conta,
    num_transacao,
    tipo_transacao,
    data_hora,
    valor
FROM transacao;

-- Procedure que executa as transferências e PIX usando transação segura (ACID)
DELIMITER //

CREATE PROCEDURE sp_executar_transferencia(
    IN p_conta_origem INT,
    IN p_conta_destino INT,
    IN p_valor DECIMAL(15,2),
    IN p_tipo_transacao VARCHAR(20) -- Aceita 'transferência' ou 'PIX'
)
BEGIN
    DECLARE v_prox_num_origem INT;
    DECLARE v_prox_num_destino INT;

    START TRANSACTION;

    -- Pega o próximo ID de transação para a conta de origem e debita
    SELECT COALESCE(MAX(num_transacao), 0) + 1 INTO v_prox_num_origem 
    FROM transacao WHERE fk_num_conta = p_conta_origem;

    INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, valor) 
    VALUES (v_prox_num_origem, p_conta_origem, p_tipo_transacao, -p_valor);

    -- Pega o próximo ID para a conta de destino e credita
    SELECT COALESCE(MAX(num_transacao), 0) + 1 INTO v_prox_num_destino 
    FROM transacao WHERE fk_num_conta = p_conta_destino;

    INSERT INTO transacao (num_transacao, fk_num_conta, tipo_transacao, valor) 
    VALUES (v_prox_num_destino, p_conta_destino, p_tipo_transacao, p_valor);

    COMMIT;
END //

DELIMITER ;


-- =========================================================================================
-- PARTE 2: TRIGGERS (GATILHOS)
-- =========================================================================================

DELIMITER //

-- Atualiza o saldo da conta automaticamente sempre que entra uma transação nova
CREATE TRIGGER trg_atualiza_saldo_apos_transacao
AFTER INSERT ON transacao
FOR EACH ROW
BEGIN
    IF NEW.tipo_transacao IN ('saque', 'pagamento') THEN
        UPDATE conta_bancaria 
        SET saldo = saldo - NEW.valor 
        WHERE num_conta = NEW.fk_num_conta;
    ELSE
        UPDATE conta_bancaria 
        SET saldo = saldo + NEW.valor 
        WHERE num_conta = NEW.fk_num_conta;
    END IF;
END //

-- Soma o salário do funcionário novo no custo total da agência
CREATE TRIGGER trg_funcionario_insert
AFTER INSERT ON funcionario
FOR EACH ROW
BEGIN
    UPDATE agencia 
    SET sal_total = sal_total + NEW.salario
    WHERE num_ag = NEW.fk_num_ag;
END //

-- Desconta o salário do funcionário que foi removido/demitido
CREATE TRIGGER trg_funcionario_delete
AFTER DELETE ON funcionario
FOR EACH ROW
BEGIN
    UPDATE agencia 
    SET sal_total = sal_total - OLD.salario
    WHERE num_ag = OLD.fk_num_ag;
END //

-- Ajusta o total da agência se o funcionário mudar de cargo (salário) ou for transferido de agência
CREATE TRIGGER trg_funcionario_update
AFTER UPDATE ON funcionario
FOR EACH ROW
BEGIN
    -- Caso o funcionário mude de agência
    IF OLD.fk_num_ag <> NEW.fk_num_ag THEN
        UPDATE agencia 
        SET sal_total = sal_total - OLD.salario
        WHERE num_ag = OLD.fk_num_ag;
        
        UPDATE agencia 
        SET sal_total = sal_total + NEW.salario
        WHERE num_ag = NEW.fk_num_ag;
        
    -- Caso apenas o salário mude
    ELSEIF OLD.salario <> NEW.salario THEN
        UPDATE agencia 
        SET sal_total = sal_total - OLD.salario + NEW.salario
        WHERE num_ag = NEW.fk_num_ag;
    END IF;
END //

DELIMITER ;


-- =========================================================================================
-- PARTE 3: CONSULTAS DA API (BACKEND NODE.JS)
-- Obs: Os "?" são preenchidos dinamicamente pelo código Node.js.
-- =========================================================================================

-- -----------------------------------------------------
-- -> Arquivo: src/services/views.ts
-- -----------------------------------------------------

-- Busca a lista de contas do gerente
SELECT * FROM v_contas_por_gerente WHERE matricula_gerente = ?;

-- Traz o extrato da conta filtrando pelos dias informados na requisição
SELECT * FROM v_extrato_transacoes 
WHERE num_conta = ? 
AND data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
ORDER BY data_hora DESC;


-- -----------------------------------------------------
-- -> Arquivo: src/services/transacoes.ts
-- -----------------------------------------------------

-- Dispara a transferência chamando a nossa procedure
CALL sp_executar_transferencia(?, ?, ?, ?);


-- -----------------------------------------------------
-- -> Arquivo: src/services/agencias.ts
-- -----------------------------------------------------

-- Lista a equipa da agência já com o total de dependentes de cada um
SELECT 
  f.nome_completo AS nome, 
  f.cargo, 
  CONCAT(f.tipo_logradouro, ' ', f.nome_logradouro, ', ', f.numero, ' - ', f.bairro, ', ', f.cidade, '/', f.estado) AS endereco, 
  f.salario, 
  COUNT(d.id_dependente) AS quantidade_dependentes
FROM funcionario f
LEFT JOIN dependente d ON d.fk_matricula = f.matricula
WHERE f.fk_num_ag = ?
GROUP BY f.matricula
ORDER BY f.nome_completo ASC; 

-- Agrupa os clientes da agência separando por tipo de conta
SELECT 
  cb.tipo_conta, 
  c.nome_completo
FROM cliente c
JOIN titularidade t ON t.fk_cpf_cliente = c.cpf
JOIN conta_bancaria cb ON cb.num_conta = t.fk_num_conta
WHERE cb.fk_num_ag = ?
GROUP BY cb.tipo_conta, c.nome_completo;

-- Acha as contas especiais que estão no vermelho (saldo negativo)
SELECT num_conta, saldo 
FROM conta_bancaria 
WHERE fk_num_ag = ? AND tipo_conta = 'conta especial' AND saldo < 0 
ORDER BY saldo ASC;

-- Acha as poupanças com dinheiro guardado (saldo positivo)
SELECT num_conta, saldo 
FROM conta_bancaria 
WHERE fk_num_ag = ? AND tipo_conta = 'poupança' AND saldo >= 0 
ORDER BY saldo DESC;

-- Ranking de contas-correntes com mais movimentações recentes
SELECT cb.num_conta, COUNT(t.num_transacao) AS total_transacoes
FROM conta_bancaria cb
JOIN transacao t ON t.fk_num_conta = cb.num_conta
WHERE cb.fk_num_ag = ? 
  AND cb.tipo_conta = 'conta-corrente'
  AND t.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
GROUP BY cb.num_conta
ORDER BY total_transacoes DESC;

-- Ranking das contas da agência com maior fluxo de dinheiro (soma absoluta das transações)
SELECT cb.num_conta, SUM(ABS(t.valor)) AS volume_total
FROM conta_bancaria cb
JOIN transacao t ON t.fk_num_conta = cb.num_conta
WHERE cb.fk_num_ag = ?
  AND t.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
GROUP BY cb.num_conta
ORDER BY volume_total DESC;


-- -----------------------------------------------------
-- -> Arquivo: src/services/cidades.ts
-- -----------------------------------------------------

-- Todos os clientes da cidade, do mais novo para o mais velho
SELECT 
  nome_completo AS nome,
  CONCAT(tipo_logradouro, ' ', nome_logradouro, ', ', numero, ' - ', bairro, ', ', cidade, '/', estado) AS endereco
FROM cliente
WHERE cidade = ?
ORDER BY data_nascimento DESC;

-- Todos os funcionários da cidade agrupados por agência, cargo e salário
SELECT 
  f.nome_completo AS nome,
  CONCAT(f.tipo_logradouro, ' ', f.nome_logradouro, ', ', f.numero, ' - ', f.bairro, ', ', f.cidade, '/', f.estado) AS endereco,
  f.cargo,
  f.salario,
  a.nome_ag AS agencia
FROM funcionario f
JOIN agencia a ON a.num_ag = f.fk_num_ag
WHERE a.cidade = ?
ORDER BY a.nome_ag, f.cargo, f.salario DESC;

-- Traz o balanço dos custos de salário de cada agência naquela cidade
SELECT nome_ag, sal_total
FROM agencia
WHERE cidade = ?
ORDER BY sal_total DESC;


-- -----------------------------------------------------
-- -> Arquivo: src/services/clientes.ts
-- -----------------------------------------------------

-- Resumo de todas as contas que o cliente tem no banco
SELECT cb.num_conta, cb.tipo_conta, cb.saldo, a.nome_ag AS agencia, f.nome_completo AS gerente
FROM conta_bancaria cb
JOIN titularidade t ON cb.num_conta = t.fk_num_conta
JOIN agencia a ON cb.fk_num_ag = a.num_ag
JOIN funcionario f ON cb.fk_matricula_gerente = f.matricula
WHERE t.fk_cpf_cliente = ?;

-- Verifica com quem o cliente divide contas conjuntas
SELECT c.nome_completo, c.cpf, t2.fk_num_conta AS num_conta
FROM titularidade t1
JOIN titularidade t2 ON t1.fk_num_conta = t2.fk_num_conta AND t1.fk_cpf_cliente != t2.fk_cpf_cliente
JOIN cliente c ON t2.fk_cpf_cliente = c.cpf
WHERE t1.fk_cpf_cliente = ?;

-- Descobre qual conta-corrente o cliente usou mais (quantidade de vezes)
SELECT cb.num_conta, COUNT(tr.num_transacao) AS total_transacoes
FROM conta_bancaria cb
JOIN titularidade t ON cb.num_conta = t.fk_num_conta
JOIN transacao tr ON cb.num_conta = tr.fk_num_conta
WHERE t.fk_cpf_cliente = ? AND cb.tipo_conta = 'conta-corrente' AND tr.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
GROUP BY cb.num_conta
ORDER BY total_transacoes DESC;

-- Descobre em qual conta o cliente movimentou mais dinheiro no total
SELECT cb.num_conta, SUM(ABS(tr.valor)) AS volume_total
FROM conta_bancaria cb
JOIN titularidade t ON cb.num_conta = t.fk_num_conta
JOIN transacao tr ON cb.num_conta = tr.fk_num_conta
WHERE t.fk_cpf_cliente = ? AND tr.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
GROUP BY cb.num_conta
ORDER BY volume_total DESC;