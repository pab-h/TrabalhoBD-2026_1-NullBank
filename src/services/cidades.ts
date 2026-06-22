import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

export class CidadesService {
  // GET /api/cidades/:nome_cidade/clientes
  getClientesPorCidade = async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome_cidade } = request.params as { nome_cidade: string };

    try {
      // Ordem crescente por idade = Da menor idade para a maior = Data de nascimento mais recente para a mais antiga (DESC)
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

  // GET /api/cidades/:nome_cidade/funcionarios
  getFuncionariosPorCidade = async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome_cidade } = request.params as { nome_cidade: string };
    const { agruparPor } = request.query as { agruparPor: "agencia" | "cargo" | "salario" };

    // Define dinamicamente a coluna de agrupamento no JSON_ARRAYAGG do MySQL
    let groupByColumn = "";
    if (agruparPor === "agencia") groupByColumn = "a.nome_ag";
    else if (agruparPor === "cargo") groupByColumn = "f.cargo";
    else if (agruparPor === "salario") groupByColumn = "f.salario";

    try {
      const query = `
        SELECT 
          ${groupByColumn} AS grupo,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'nome', f.nome_completo,
              'cargo', f.cargo,
              'salario', f.salario,
              'agencia', a.nome_ag,
              'endereco', CONCAT(f.tipo_logradouro, ' ', f.nome_logradouro, ', ', f.numero, ' - ', f.bairro, ', ', f.cidade, '/', f.estado)
            )
          ) AS colaboradores
        FROM funcionario f
        JOIN agencia a ON a.num_ag = f.fk_num_ag
        WHERE a.cidade = ?
        GROUP BY ${groupByColumn}
      `;
      
      const [rows] = await pool.query(query, [nome_cidade]);
      return reply.status(200).send(rows);
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao buscar funcionários da cidade." });
    }
  };

  // GET /api/cidades/:nome_cidade/agencias/balanco-salarial
  getBalancoSalarial = async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome_cidade } = request.params as { nome_cidade: string };

    try {
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