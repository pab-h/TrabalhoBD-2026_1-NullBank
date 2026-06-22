import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database"; // Assumindo que seu pool se conecta ao MySQL

export class AgenciasService {
  // GET /api/agencias/:id/funcionarios
  getFuncionarios = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { ordenarPor } = request.query as { ordenarPor?: "nome" | "salario" };

    // Mapeamento correto conforme a tabela 'funcionario'
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
      
      const [rows] = await pool.query(query, [id]); // Padrão de desestruturação para bibliotecas MySQL (ex: mysql2)
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar funcionários." });
    }
  };

  // GET /api/agencias/:id/clientes
  getClientes = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      // Agrupamento usando as funções nativas de JSON do MySQL (JSON_OBJECT e JSON_ARRAYAGG)
      const query = `
        SELECT 
          cb.tipo_conta, 
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'cpf', c.cpf, 
              'nome', c.nome_completo
            )
          ) AS clientes
        FROM cliente c
        JOIN titularidade t ON t.fk_cpf_cliente = c.cpf
        JOIN conta_bancaria cb ON cb.num_conta = t.fk_num_conta
        WHERE cb.fk_num_ag = ?
        GROUP BY cb.tipo_conta
      `;
      
      const [rows] = await pool.query(query, [id]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar clientes." });
    }
  };

  // GET /api/agencias/:id/contas/especiais-devedoras
  getContasEspeciaisDevedoras = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      // Filtrando pelo ENUM 'conta especial' e saldo < 0
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

  // GET /api/agencias/:id/contas/poupancas-positivas
  getContasPoupancasPositivas = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      // Filtrando pelo ENUM 'poupança' e saldo >= 0
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

  // GET /api/agencias/:id/contas/correntes-movimentadas
  getContasCorrentesMovimentadas = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

    if (!periodo) {
      return reply.status(400).send({ error: "O parâmetro 'periodo' é obrigatório." });
    }

    // Tradução limpa de dias para a função DATE_SUB do MySQL
    const dias = parseInt(periodo.replace("d", ""), 10);

    try {
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

  // GET /api/agencias/:id/contas/maior-volume
  getContasMaiorVolume = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

    if (!periodo) {
      return reply.status(400).send({ error: "O parâmetro 'periodo' é obrigatório." });
    }

    const dias = parseInt(periodo.replace("d", ""), 10);

    try {
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