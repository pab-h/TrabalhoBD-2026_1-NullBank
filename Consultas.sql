-- Consultar o saldo atual de todas as contas
SELECT num_conta, tipo_conta, saldo FROM conta;

-- Testar a Visão de Contas por Gerente (Exemplo com o gerente F001)
SELECT * FROM v_contas_por_gerente WHERE matricula_gerente = 'F001';

-- Testar a Visão de Extrato Bancário (Exemplo com a conta 1001)
SELECT * FROM v_extrato_transacoes WHERE num_conta = 1001;

-- Testar a Execução da Transferência
CALL sp_executar_transferencia(1001, 1002, 50.00, 'PIX');