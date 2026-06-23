import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

export class ClientesService {

    getContasCliente = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };

        try {
            const query = `
            SELECT cb.num_conta, cb.tipo_conta, cb.saldo, a.nome_ag AS agencia, f.nome_completo AS gerente
            FROM conta_bancaria cb
            JOIN titularidade t ON cb.num_conta = t.fk_num_conta
            JOIN agencia a ON cb.fk_num_ag = a.num_ag
            JOIN funcionario f ON cb.fk_matricula_gerente = f.matricula
            WHERE t.fk_cpf_cliente = ?
            `;
            const [rows] = await pool.query(query, [cpf]);
            return reply.status(200).send(rows);
        } catch (error) {
            return reply.status(500).send({ error: "Erro ao buscar contas do cliente" });
        }
    };

    getContasConjuntas = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };

        try {
            const query = `
            SELECT c.nome_completo, c.cpf, t2.fk_num_conta AS num_conta
            FROM titularidade t1
            JOIN titularidade t2 ON t1.fk_num_conta = t2.fk_num_conta AND t1.fk_cpf_cliente != t2.fk_cpf_cliente
            JOIN cliente c ON t2.fk_cpf_cliente = c.cpf
            WHERE t1.fk_cpf_cliente = ?
            `;
            const [rows] = await pool.query(query, [cpf]);
            return reply.status(200).send(rows);
        } catch (error) {
            return reply.status(500).send({ error: "Erro ao buscar contas conjuntas" });
        }
    };

    getContasCorrentesMovimentadas = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };
        const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

        if (!periodo) {
            return reply.status(400).send({ error: "Parâmetro 'período' obrigatório" });

        }
        const dias = parseInt(periodo.replace("d", ""), 10);

        try {
            const query = `
            SELECT cb.num_conta, COUNT(tr.num_transacao) AS total_transacoes
            FROM conta_bancaria cb
            JOIN titularidade t ON cb.num_conta = t.fk_num_conta
            JOIN transacao tr ON cb.num_conta = tr.fk_num_conta
            WHERE t.fk_cpf_cliente = ? AND cb.tipo_conta = 'conta-corrente' AND tr.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY cb.num_conta
            ORDER BY total_transacoes DESC
            `;
            const [rows] = await pool.query(query, [cpf, dias]);
            return reply.status(200).send(rows);
        } catch (error) {

        }
    };

    getContasMaiorVolume = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };
        const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

        if (!periodo) {
            return reply.status(400).send({ error: "Parâmetro 'período' obrigatório" });
        }
        const dias = parseInt(periodo.replace("d", ""), 10);

        try {
            const query = `
            SELECT cb.num_conta, SUM(ABS(tr.valor)) AS volume_total
            FROM conta_bancaria cb
            JOIN titularidade t ON cb.num_conta = t.fk_num_conta
            JOIN transacao tr ON cb.num_conta = tr.fk_num_conta
            WHERE t.fk_cpf_cliente = ? AND tr.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY cb.num_conta
            ORDER BY volume_total DESC
            `;
            const [rows] = await pool.query(query, [cpf, dias]);
            return reply.status(200).send(rows);
        } catch (error) {
            return reply.status(500).send({ error: "Erro ao buscar contas com maior volume de transações" });
        }
    };
}