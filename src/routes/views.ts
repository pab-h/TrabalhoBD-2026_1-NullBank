import { FastifyPluginAsync } from "fastify";
import { ViewsService } from "../services/views";

export const viewsRoutes: FastifyPluginAsync = async app => {
    const viewsService = new ViewsService();

    app.get("/gerentes/:matricula/contas", {
        schema: {
            tags: ['views'],
            description: 'Lista de forma consolidada as contas sob supervisão direta de um gerente.',
        }
    }, viewsService.getContasPorGerente);

    app.get("/contas/:num_conta/extrato", {
        schema: {
            tags: ['views'],
            description: 'Emite o histórico de movimentações financeiras de uma conta (Extrato).',
            querystring: {
                type: 'object',
                required: ['periodo'],
                properties: {
                    periodo: { 
                        type: 'string', 
                        enum: ['7d', '30d', '365d'],
                        description: 'Período de filtro (7d, 30d ou 365d)'
                    }
                }
            }
        }
    }, viewsService.getExtratoConta);
}