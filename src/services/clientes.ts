import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

export class ClientesService {

    getContasCliente = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };

        try {
            const querry = `
            SELECT cb.num_conta, cb.tipo_conta, cb.saldo, a.nome_ag AS agencia, f.nome_completo AS gerente
            FROM conta_bancaria cb
            JOIN titularidade t ON cb.num_conta = t.fk_num_conta
            JOIN agencia a ON cb.fk_num_ag = a.num_ag
            JOIN funcionario f ON cb.fk_matricula_gerente = f.matricula
            WHERE t.fk_cpf_cliente = ?
            `;
            const [rows] = await pool.query(querry, [cpf]);
            return reply.send(200).send(rows);
        }        catch (error) {
            return reply.status(500).send({ error: "Erro ao buscar contas do cliente" });
        }
    }

    getContasConjuntas = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };

        try
    }
}