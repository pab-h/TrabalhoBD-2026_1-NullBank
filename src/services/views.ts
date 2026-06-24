import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

export class ViewsService {

    getContasPorGerente = async (request: FastifyRequest, reply: FastifyReply) => {
        const { matricula } = request.params as { matricula: string };

        try {
            // Traz a view pré-montada com a carteira de clientes do gerente
            const [rows] = await pool.query(
                'SELECT * FROM v_contas_por_gerente WHERE matricula_gerente = ?',
                [matricula]
            );
            reply.status(200).send(rows);
        } catch (error: any) {
            reply.status(500).send({ error: "Erro ao consultar as contas do gerente.", details: error.message });
        }
    }

    getExtratoConta = async (request: FastifyRequest, reply: FastifyReply) => {
        const { num_conta } = request.params as { num_conta: string };
        const { periodo } = request.query as { periodo: string };

        if (!['7d', '30d', '365d'].includes(periodo)) {
            return reply.status(400).send({ error: "O parâmetro de consulta 'periodo' deve ser '7d', '30d' ou '365d'." });
        }

        // Traduz a janela de tempo da requisição para dias matemáticos do SQL
        const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 365;

        try {
            // Traz o histórico limpo da view filtrando pelos dias escolhidos
            const [rows] = await pool.query(
                `SELECT * FROM v_extrato_transacoes 
                 WHERE num_conta = ? 
                 AND data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ORDER BY data_hora DESC`,
                [num_conta, dias]
            );
            reply.status(200).send(rows);
        } catch (error: any) {
            reply.status(500).send({ error: "Erro ao consultar o extrato.", details: error.message });
        }
    }
}