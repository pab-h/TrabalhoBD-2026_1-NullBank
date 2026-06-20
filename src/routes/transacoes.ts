import { FastifyPluginAsync } from "fastify";

import { TransacoesService } from "../services/transacoes";

export const transacoesRoutes: FastifyPluginAsync = async app => {

    const transacoesService = new TransacoesService();

    // Defina as rotas aqui

}
