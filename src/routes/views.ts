import { FastifyPluginAsync } from "fastify";

import { ViewsService } from "../services/views";

export const viewsRoutes: FastifyPluginAsync = async app => {

    const viewsService = new ViewsService();

    // Defina as rotas aqui

}
