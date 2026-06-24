import { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../database";

export class DependentesService {
  
  // POST /api/dependentes
  createDependente = async (request: FastifyRequest, reply: FastifyReply) => {
    const { fk_matricula, nome_completo, data_nascimento, parentesco } = request.body as {
      fk_matricula: string;
      nome_completo: string;
      data_nascimento: string;
      parentesco: 'filho(a)' | 'cônjuge' | 'genitor(a)';
    };

    try {
      const query = `
        INSERT INTO dependente (fk_matricula, nome_completo, data_nascimento, parentesco) 
        VALUES (?, ?, ?, ?)
      `;
      
      const [result] = await pool.query(query, [
        fk_matricula, nome_completo, data_nascimento, parentesco
      ]);
      
      const insertId = (result as any).insertId;

      return reply.status(201).send({
        id_dependente: insertId,
        fk_matricula,
        nome_completo,
        message: "Dependente cadastrado com sucesso."
      });
    } catch (error: any) {
      // Trata a restrição UNIQUE (uq_dependente_funcionario) para evitar duplicados para o mesmo funcionário
      if (error.code === "ER_DUP_ENTRY") {
        return reply.status(400).send({ error: "Este funcionário já possui um dependente cadastrado com este mesmo nome." });
      }
      // Se a matrícula do funcionário (FK) não existir
      if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
        return reply.status(400).send({ error: "A matrícula do funcionário informada não existe." });
      }
      return reply.status(500).send({ error: "Erro interno ao cadastrar dependente." });
    }
  };

  // PUT /api/dependentes/:id
  updateDependente = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    try {
      const campos: string[] = [];
      const valores: any[] = [];

      Object.keys(body).forEach((key) => {
        if (body[key] !== undefined) {
          campos.push(`${key} = ?`);
          valores.push(body[key]);
        }
      });

      if (campos.length === 0) {
        return reply.status(400).send({ error: "Nenhum campo informado para atualização." });
      }

      valores.push(id); // ID para o WHERE (id_dependente)

      const query = `UPDATE dependente SET ${campos.join(", ")} WHERE id_dependente = ?`;
      const [result] = await pool.query(query, valores);

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send({ error: "Dependente não encontrado." });
      }

      return reply.status(200).send({ message: "Dados do dependente atualizados com sucesso." });
    } catch (error: any) {
      if (error.code === "ER_DUP_ENTRY") {
        return reply.status(400).send({ error: "A atualização geraria um dependente duplicado (mesmo nome) para este funcionário." });
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
        return reply.status(400).send({ error: "A matrícula do funcionário informada não existe." });
      }
      return reply.status(500).send({ error: "Erro interno ao atualizar dependente." });
    }
  };

  // DELETE /api/dependentes/:id
  deleteDependente = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const query = `DELETE FROM dependente WHERE id_dependente = ?`;
      const [result] = await pool.query(query, [id]);

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send({ error: "Dependente não encontrado." });
      }

      return reply.status(200).send({ message: "Dependente removido com sucesso." });
    } catch (error) {
      return reply.status(500).send({ error: "Erro interno ao remover dependente." });
    }
  };
}