import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database"; 

export class AgenciasService {
  
  getFuncionarios = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { ordenarPor } = request.query as { ordenarPor?: "nome" | "salario" };

    // Define se vamos ordenar pelo nome (A-Z) ou por quem ganha mais
    const orderByColumn = ordenarPor === "salario" ? "f.salario DESC" : "f.nome_completo ASC";

    try {
      const query = `
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
        ORDER BY ${orderByColumn}
      `;
      
      const [rows] = await pool.query(query, [id]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar funcionários." });
    }
  };

  getClientes = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const query = `
        SELECT 
          cb.tipo_conta, 
          c.nome_completo
        FROM cliente c
        JOIN titularidade t ON t.fk_cpf_cliente = c.cpf
        JOIN conta_bancaria cb ON cb.num_conta = t.fk_num_conta
        WHERE cb.fk_num_ag = ?
        GROUP BY cb.tipo_conta, c.nome_completo
      `;
      
      // Pega só os resultados do banco e avisa ao TypeScript o formato deles
      const [result] = await pool.query(query, [id]);
      const rows = result as { tipo_conta: string; nome_completo: string }[];

      // Agrupa a lista numa estrutura limpa separada por categorias de conta
      const resultadoAgrupado = rows.reduce((acc, row) => {
        const { tipo_conta, nome_completo } = row;

        if (!acc[tipo_conta]) {
          acc[tipo_conta] = [];
        }

        acc[tipo_conta].push({
          nome: nome_completo
        });

        return acc;
      }, {} as Record<string, { nome: string }[]>);

      return reply.status(200).send(resultadoAgrupado);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar clientes." });
    }
  };

  getContasEspeciaisDevedoras = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      // Filtra as contas do tipo especial que estão com o saldo no vermelho
      const query = `
        SELECT num_conta, saldo 
        FROM conta_bancaria 
        WHERE fk_num_ag = ? AND tipo_conta = 'conta especial' AND saldo < 0 
        ORDER BY saldo ASC
      `;
      
      const [rows] = await pool.query(query, [id]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar contas devedoras." });
    }
  };

  getContasPoupancasPositivas = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      // Traz as poupanças com dinheiro guardado (saldo positivo ou zerado)
      const query = `
        SELECT num_conta, saldo 
        FROM conta_bancaria 
        WHERE fk_num_ag = ? AND tipo_conta = 'poupança' AND saldo >= 0 
        ORDER BY saldo DESC
      `;
      
      const [rows] = await pool.query(query, [id]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar contas poupança." });
    }
  };

  getContasCorrentesMovimentadas = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

    if (!periodo) {
      return reply.status(400).send({ error: "O parâmetro 'periodo' é obrigatório." });
    }

    // Limpa a string (ex: de '7d' para 7) para injetar de forma limpa no filtro do banco
    const dias = parseInt(periodo.replace("d", ""), 10);

    try {
      // Descobre quais contas-correntes tiveram mais atividade recentemente
      const query = `
        SELECT cb.num_conta, COUNT(t.num_transacao) AS total_transacoes
        FROM conta_bancaria cb
        JOIN transacao t ON t.fk_num_conta = cb.num_conta
        WHERE cb.fk_num_ag = ? 
          AND cb.tipo_conta = 'conta-corrente'
          AND t.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY cb.num_conta
        ORDER BY total_transacoes DESC
      `;
      
      const [rows] = await pool.query(query, [id, dias]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar correntes movimentadas." });
    }
  };

  getContasMaiorVolume = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

    if (!periodo) {
      return reply.status(400).send({ error: "O parâmetro 'periodo' é obrigatório." });
    }

    const dias = parseInt(periodo.replace("d", ""), 10);

    try {
      // Soma tudo o que entrou e saiu para achar as contas que giraram mais dinheiro
      const query = `
        SELECT cb.num_conta, SUM(ABS(t.valor)) AS volume_total
        FROM conta_bancaria cb
        JOIN transacao t ON t.fk_num_conta = cb.num_conta
        WHERE cb.fk_num_ag = ?
          AND t.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY cb.num_conta
        ORDER BY volume_total DESC
      `;

      const [rows] = await pool.query(query, [id, dias]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar volume financeiro." });
    }
  };
}