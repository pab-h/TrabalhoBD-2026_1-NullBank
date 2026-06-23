import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { ClientesService } from "../services/clientes";

export const clientesRoutes: FastifyPluginAsync = async (app) => {
  const clientesService = new ClientesService();

  const verificarAcesso = (rolesPermitidas: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userRole = request.headers["x-user-role"] as string;

      if (!userRole || !rolesPermitidas.includes(userRole)) {
        return reply.status(403).send({ 
          error: "Acesso negado. Você não tem permissão para acessar este recurso." 
        });
      }
    };
  };

  const paramsCpfSchema = {
    type: 'object',
    properties: {
      cpf: { type: 'string', description: 'CPF do cliente (11 dígitos, sem pontuação)' }
    },
    required: ['cpf']
  };

  const headersSchema = {
    type: "object",
    properties: {
      "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA), Gerente ou Atendente)" }
    },
    required: ["x-user-role"]
  };

  const queryStringPeriodo = {
    type: "object",
    properties: {
      periodo: { 
        type: "string", 
        enum: ["7d", "30d", "365d"],
        description: "Janela temporal filtrada retroativamente." 
      }
    },
    required: ["periodo"]
  };

  app.get(
    "/:cpf/contas",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "Atendente"])],
      schema: {
        description: "Retorna a lista de contas vinculadas ao cliente, exibindo os tipos, agências responsáveis, gerentes e saldos atuais.",
        tags: ["clientes"],
        params: paramsCpfSchema,
        headers: headersSchema,
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                num_conta: { type: "integer" },
                tipo_conta: { type: "string" },
                saldo: { type: "number" },
                agencia: { type: "string" },
                gerente: { type: "string" }
              }
            }
          }
        }
      }
    },
    clientesService.getContasCliente
  );

  app.get(
    "/:cpf/conjuntos",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "Atendente"])],
      schema: {
        description: "Lista os nomes e CPFs de outros clientes que possuem titularidade conjunta em alguma conta bancária com o cliente consultado.",
        tags: ["clientes"],
        params: paramsCpfSchema,
        headers: headersSchema,
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome_completo: { type: "string" },
                cpf: { type: "string" },
                num_conta: { type: "integer" }
              }
            }
          }
        }
      }
    },
    clientesService.getContasConjuntas
  );

  app.get(
    "/:cpf/contas/correntes-movimentadas",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "Atendente"])],
      schema: {
        description: "Lista as contas do tipo 'conta-corrente' do cliente com o maior número de transações efetuadas dentro de uma janela temporal específica.",
        tags: ["clientes"],
        params: paramsCpfSchema,
        headers: headersSchema,
        querystring: queryStringPeriodo,
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                num_conta: { type: "integer" },
                total_transacoes: { type: "integer" }
              }
            }
          }
        }
      }
    },
    clientesService.getContasCorrentesMovimentadas
  );

  app.get(
    "/:cpf/contas/maior-volume",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "Atendente"])],
      schema: {
        description: "Lista as contas do cliente que obtiveram o maior volume financeiro total acumulado no período selecionado.",
        tags: ["clientes"],
        params: paramsCpfSchema,
        headers: headersSchema,
        querystring: queryStringPeriodo,
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                num_conta: { type: "integer" },
                volume_total: { type: "number" }
              }
            }
          }
        }
      }
    },
    clientesService.getContasMaiorVolume
  );
};