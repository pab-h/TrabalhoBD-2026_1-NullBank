import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { CidadesService } from "../services/cidades";

export const cidadesRoutes: FastifyPluginAsync = async (app) => {
  const cidadesService = new CidadesService();

  const verificarAcesso = (rolesPermitidas: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userRole = request.headers["x-user-role"] as string;
      if (!userRole || !rolesPermitidas.includes(userRole)) {
        return reply.status(403).send({ error: "Acesso negado." });
      }
    };
  };

  const paramsCidadeSchema = {
    type: 'object',
    properties: {
      nome_cidade: { type: 'string', description: 'Nome exato da cidade pesquisada' }
    },
    required: ['nome_cidade']
  };

  // 1. Clientes por Cidade
  app.get(
    "/:nome_cidade/clientes",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Lista o nome e o endereço de todos os clientes que residem na cidade informada, ordenados de forma crescente por idade.",
        tags: ["cidades"],
        params: paramsCidadeSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Requer: DBA ou Gerente" } },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: { nome: { type: "string" }, endereco: { type: "string" } }
            }
          }
        }
      }
    },
    cidadesService.getClientesPorCidade
  );

  // 2. Funcionários por Cidade
  app.get(
    "/:nome_cidade/funcionarios",
    {
      preHandler: [verificarAcesso(["DBA"])],
      schema: {
        description: "Lista o nome, endereço, cargo, salário e agência de todos os funcionários que trabalham na cidade informada, ordenados por agência, cargo e salário",
        tags: ["cidades"],
        params: paramsCidadeSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Requer: DBA" } },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                endereco: { type: "string" },
                cargo: { type: "string" },
                salario: { type: "number" },
                agencia: { type: "string" }
              }
            }
          }
        }
      }
    },
    cidadesService.getFuncionariosPorCidade
  );

  // 3. Balanço Salarial por Cidade
  app.get(
    "/:nome_cidade/agencias/balanco-salarial",
    {
      preHandler: [verificarAcesso(["DBA"])],
      schema: {
        description: "Exibe o nome das agências operantes na cidade e o valor consolidado de sua folha salarial (sal_total), do maior para o menor.",
        tags: ["cidades"],
        params: paramsCidadeSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Requer: DBA" } },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: { nome_ag: { type: "string" }, sal_total: { type: "number" } }
            }
          }
        }
      }
    },
    cidadesService.getBalancoSalarial
  );
};