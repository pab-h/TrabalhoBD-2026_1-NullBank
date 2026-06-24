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

        // Garante que não tentem usar rotas de transferência para outras operações
        if (!['transferência', 'PIX'].includes(payload.tipo_transacao)) {
            return reply.status(400).send({ error: "O tipo_transacao deve ser estritamente 'transferência' ou 'PIX'." });
        }

        // Evita tentativas de transferir zero ou dinheiro negativo
        if (payload.valor <= 0) {
            return reply.status(400).send({ error: "O valor da transferência tem de ser superior a zero." });
        }

        try {
            // Delega a transação à procedure no banco para garantir segurança (ACID)
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
            // Apanha erros emitidos pelas regras do banco de dados (ex: triggers de validação)
            reply.status(500).send({ 
                error: "Falha na execução da transferência bancária.", 
                details: error.message 
            });
        }
    }
}