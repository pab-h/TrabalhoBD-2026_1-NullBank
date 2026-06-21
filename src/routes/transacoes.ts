import { FastifyPluginAsync } from "fastify";
import { TransacoesService } from "../services/transacoes";

export const transacoesRoutes: FastifyPluginAsync = async app => {
    const transacoesService = new TransacoesService();

    app.post("/transferencia", {
        schema: {
            tags: ['transacoes'],
            description: 'Realiza uma transferência eletrônica de fundos ou PIX entre contas.',
            body: {
                type: 'object',
                required: ['conta_origem', 'conta_destino', 'valor', 'tipo_transacao'],
                properties: {
                    conta_origem: { 
                        type: 'integer', 
                        description: 'Número da conta que vai enviar o dinheiro'
                    },
                    conta_destino: { 
                        type: 'integer', 
                        description: 'Número da conta que vai receber o dinheiro'
                    },
                    valor: { 
                        type: 'number', 
                        description: 'Valor a ser transferido'
                    },
                    tipo_transacao: { 
                        type: 'string', 
                        enum: ['transferência', 'PIX'],
                        description: 'Modalidade da operação'
                    }
                }
            }
        }
    }, transacoesService.executarTransferencia);
}