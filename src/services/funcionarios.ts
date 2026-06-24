import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database"; 

export class FuncionariosService {

    createFuncionario = async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      matricula, nome_completo, senha, tipo_logradouro, nome_logradouro,
      numero, complemento, bairro, cidade, estado, cep, cargo, genero,
      data_nascimento, salario, fk_num_ag
    } = request.body as any;


    if (salario < 2286.00) {
      return reply.status(400).send({ 
        error: "Operação inválida. O salário não pode ser menor que o salário-base de R$ 2.286,00." 
      });
    }

    try {
        
      const senhaCriptografada = senha; 

      const query = `
        INSERT INTO funcionario (
          matricula, nome_completo, senha, tipo_logradouro, nome_logradouro,
          numero, complemento, bairro, cidade, estado, cep, cargo, genero,
          data_nascimento, salario, fk_num_ag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await pool.query(query, [
        matricula, nome_completo, senhaCriptografada, tipo_logradouro, nome_logradouro,
        numero, complemento || null, bairro, cidade, estado, cep, cargo, genero,
        data_nascimento, salario, fk_num_ag
      ]);

      return reply.status(201).send({
        matricula,
        nome_completo,
        message: "Funcionário cadastrado com sucesso."
      });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return reply.status(400).send({ error: "Esta matrícula já está cadastrada no sistema." });
      }
      return reply.status(500).send({ error: "Erro interno ao cadastrar funcionário." });
    }
  };

  // PUT /api/funcionarios/:matricula
  updateFuncionario = async (request: FastifyRequest, reply: FastifyReply) => {
    const { matricula } = request.params as { matricula: string };
    const body = request.body as any;

    if (body.salario !== undefined && body.salario < 2286.00) {
      return reply.status(400).send({ error: "O salário não pode ser menor que o salário-base de R$ 2.286,00." });
    }

    try {
      const campos: string[] = [];
      const valores: any[] = [];

      // Mapeia dinamicamente os campos enviados no corpo da requisição
      Object.keys(body).forEach((key) => {
        if (body[key] !== undefined) {
          campos.push(`${key} = ?`);
          valores.push(body[key]);
        }
      });

      if (campos.length === 0) {
        return reply.status(400).send({ error: "Nenhum campo informado para atualização." });
      }

      valores.push(matricula);

      const query = `UPDATE funcionario SET ${campos.join(", ")} WHERE matricula = ?`;
      const [result] = await pool.query(query, valores);
      
      if ((result as any).affectedRows === 0) {
        return reply.status(404).send({ error: "Funcionário não encontrado." });
      }

      return reply.status(200).send({ message: "Dados do funcionário atualizados com sucesso." });
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao atualizar funcionário." });
    }
  };

  // DELETE /api/funcionarios/:matricula
  deleteFuncionario = async (request: FastifyRequest, reply: FastifyReply) => {
    const { matricula } = request.params as { matricula: string };

    try {
      const query = `DELETE FROM funcionario WHERE matricula = ?`;
      const [result] = await pool.query(query, [matricula]);

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send({ error: "Funcionário não encontrado." });
      }

      return reply.status(200).send({ message: "Funcionário removido com sucesso." });
    } catch (error: any) {
      // Bloqueia exclusão caso o funcionário seja gerente de alguma conta ativa (RESTRICT)
      if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
        return reply.status(400).send({ 
          error: "Não é possível remover o funcionário pois ele está vinculado como gerente de contas bancárias ativas." 
        });
      }
      return reply.status(500).send({ error: "Erro interno ao remover funcionário." });
    }
  };
}