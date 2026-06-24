import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

export class CidadesService {
  
  getClientesPorCidade = async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome_cidade } = request.params as { nome_cidade: string };

    try {
      // A ordem DESC na data de nascimento traz os clientes mais jovens primeiro
      const query = `
        SELECT 
          nome_completo AS nome,
          CONCAT(tipo_logradouro, ' ', nome_logradouro, ', ', numero, ' - ', bairro, ', ', cidade, '/', estado) AS endereco
        FROM cliente
        WHERE cidade = ?
        ORDER BY data_nascimento DESC
      `;

      const [rows] = await pool.query(query, [nome_cidade]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar clientes da cidade." });
    }
  };

  getFuncionariosPorCidade = async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome_cidade } = request.params as { nome_cidade: string };

    try {
      // Lista a equipa inteira da cidade organizando por agência, depois cargo e salário
      const query = `
        SELECT 
          f.nome_completo AS nome,
          CONCAT(f.tipo_logradouro, ' ', f.nome_logradouro, ', ', f.numero, ' - ', f.bairro, ', ', f.cidade, '/', f.estado) AS endereco,
          f.cargo,
          f.salario,
          a.nome_ag AS agencia
        FROM funcionario f
        JOIN agencia a ON a.num_ag = f.fk_num_ag
        WHERE a.cidade = ?
        ORDER BY a.nome_ag, f.cargo, f.salario DESC
      `;

      const [rows] = await pool.query(query, [nome_cidade]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar funcionários da cidade." });
    }
  };

  getBalancoSalarial = async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome_cidade } = request.params as { nome_cidade: string };

    try {
      // Mostra quanto cada agência da cidade está a gastar em salários
      const query = `
        SELECT nome_ag, sal_total
        FROM agencia
        WHERE cidade = ?
        ORDER BY sal_total DESC
      `;

      const [rows] = await pool.query(query, [nome_cidade]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar balanço salarial." });
    }
  };
}