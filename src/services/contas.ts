import { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../database";

export class ContasBancariasService {
  
  // POST /api/contas
  createConta = async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      senha, tipo_conta, fk_num_ag, fk_matricula_gerente,
      taxa_juros, limite_credito, data_aniversario_contrato
    } = request.body as any;

    // try {
      // O campo saldo possui o valor DEFAULT 0.00 no banco, portanto não precisa ser passado obrigatoriamente
      const query = `
        INSERT INTO conta_bancaria (
          senha, tipo_conta, fk_num_ag, fk_matricula_gerente,
          taxa_juros, limite_credito, data_aniversario_contrato
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await pool.query(query, [
        senha, // Em produção, aplique um hash seguro na senha da conta
        tipo_conta,
        fk_num_ag,
        fk_matricula_gerente,
        taxa_juros ?? null,
        limite_credito ?? null,
        data_aniversario_contrato ?? null
      ]);

      const insertId = (result as any).insertId;

      return reply.status(201).send({
        num_conta: insertId,
        tipo_conta,
        saldo: 0.00,
        message: "Conta bancária aberta com sucesso."
      });
    // } catch (error: any) {
    //   // Captura caso a agência ou a matrícula do gerente informadas não existam (FK Restrict)
    //   if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
    //     return reply.status(400).send({ 
    //       error: "Erro de integridade. A agência ou a matrícula do gerente informada não existe." 
    //     });
    //   }
    //   return reply.status(500).send({ error: "Erro interno ao abrir conta bancária." });
    // }
  };

  // PUT /api/contas/:num_conta
  updateConta = async (request: FastifyRequest, reply: FastifyReply) => {
    const { num_conta } = request.params as { num_conta: string };
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

      valores.push(num_conta);

      const query = `UPDATE conta_bancaria SET ${campos.join(", ")} WHERE num_conta = ?`;
      const [result] = await pool.query(query, valores);

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send({ error: "Conta bancária não encontrada." });
      }

      return reply.status(200).send({ message: "Dados da conta bancária atualizados com sucesso." });
    } catch (error: any) {
      if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
        return reply.status(400).send({ error: "A agência ou a matrícula do gerente informada não existe." });
      }
      return reply.status(500).send({ error: "Erro interno ao atualizar conta bancária." });
    }
  };

  // DELETE /api/contas/:num_conta
  deleteConta = async (request: FastifyRequest, reply: FastifyReply) => {
    const { num_conta } = request.params as { num_conta: string };

    try {
      const query = `DELETE FROM conta_bancaria WHERE num_conta = ?`;
      const [result] = await pool.query(query, [num_conta]);

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send({ error: "Conta bancária não encontrada." });
      }

      return reply.status(200).send({ message: "Conta bancária encerrada/removida com sucesso." });
    } catch (error: any) {
      // Captura o bloqueio caso a conta possua movimentações/transações vinculadas ou titularidades (ON DELETE RESTRICT)
      if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
        return reply.status(400).send({ 
          error: "Não é possível remover a conta bancária pois existem transações ou registros de titularidade vinculados a ela." 
        });
      }
      return reply.status(500).send({ error: "Erro interno ao remover conta bancária." });
    }
  };
}