import { FastifyPluginAsync } from "fastify";

import { agenciasRoutes }     from "./agencias";
import { clientesRoutes }     from "./clientes";
import { transacoesRoutes }   from "./transacoes";
import { viewsRoutes }        from "./views";
import { cidadesRoutes }      from "./cidades";
import { funcionariosRoutes } from "./funcionarios";
import { dependentesRoutes } from "./dependentes";

export const routes: FastifyPluginAsync = async app => {

    app.register(agenciasRoutes, { prefix: "/agencias" });
    app.register(funcionariosRoutes, { prefix: "/funcionarios" });
    app.register(dependentesRoutes, { prefix: "/dependentes" });
    app.register(clientesRoutes, { prefix: "/clientes" });
    app.register(cidadesRoutes, { prefix: "/cidades" });
    app.register(transacoesRoutes, { prefix: "/transacoes" });
    app.register(viewsRoutes, { prefix: "/views" });

}
