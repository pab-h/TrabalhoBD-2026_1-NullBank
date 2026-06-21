import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

interface PayloadTransferencia {
    conta_origem: number;
    conta_destino: number;
    valor: number;
    tipo_transacao: string;
}

export class TransacoesService {

    executarTransferencia = async (request: FastifyRequest, reply: FastifyReply) => {
        const payload = request.body as PayloadTransferencia;

        // Validações simples de integridade
        if (!['transferência', 'PIX'].includes(payload.tipo_transacao)) {
            return reply.status(400).send({ error: "O tipo_transacao deve ser estritamente 'transferência' ou 'PIX'." });
        }

        if (payload.valor <= 0) {
            return reply.status(400).send({ error: "O valor da transferência tem de ser superior a zero." });
        }

        try {
            // Invoca a procedure que lida com a transação e chaves compostas
            await pool.query(
                'CALL sp_executar_transferencia(?, ?, ?, ?)',
                [
                    payload.conta_origem, 
                    payload.conta_destino, 
                    payload.valor, 
                    payload.tipo_transacao
                ]
            );

            reply.status(200).send({ message: "Operação financeira realizada com sucesso." });
        } catch (error: any) {
            // Erros lançados pelo BD, por exemplo, de triggers barrando limite de crédito
            reply.status(500).send({ 
                error: "Falha na execução da transferência bancária.", 
                details: error.message 
            });
        }
    }
}