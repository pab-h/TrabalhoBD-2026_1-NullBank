import { FastifyPluginAsync } from "fastify";

import { ClientesService } from "../services/clientes";

export const clientesRoutes: FastifyPluginAsync = async app => {

    const clientesService = new ClientesService();

    // Defina as rotas aqui

}
