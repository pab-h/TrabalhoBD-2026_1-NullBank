import { FastifyPluginAsync } from "fastify";

import { AgenciasService } from "../services/agencias";

export const agenciasRoutes: FastifyPluginAsync = async app => {

    const agenciasService = new AgenciasService();

    // Defina as rotas aqui

}
