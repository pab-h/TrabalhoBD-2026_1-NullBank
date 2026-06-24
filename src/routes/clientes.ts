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

  const clienteBodySchema = {
    type: "object",
    properties: {
      cpf: { type: "string", minLength: 11, maxLength: 11, examples: ["12345678901"] },
      nome_completo: { type: "string", maxLength: 150, examples: ["Maria Oliveira Silva"] },
      rg: { type: "string", maxLength: 15, examples: ["20081234567"] },
      orgao_emissor: { type: "string", maxLength: 10, examples: ["SSP"] },
      uf_rg: { type: "string", minLength: 2, maxLength: 2, examples: ["CE"] },
      data_nascimento: { type: "string", format: "date", examples: ["1988-11-23"] },
      tipo_logradouro: { type: "string", maxLength: 20, examples: ["Avenida"] },
      nome_logradouro: { type: "string", maxLength: 100, examples: ["Dom José"] },
      numero: { type: "string", maxLength: 10, examples: ["1200"] },
      complemento: { type: "string", maxLength: 50, examples: ["Bloco B, Apt 101"] },
      bairro: { type: "string", maxLength: 50, examples: ["Centro"] },
      cep: { type: "string", minLength: 8, maxLength: 8, examples: ["62010215"] },
      cidade: { type: "string", maxLength: 100, examples: ["Sobral"] },
      estado: { type: "string", minLength: 2, maxLength: 2, examples: ["CE"] }
    }
  };

  // 1. Inserir Cliente (POST)
  app.post(
    "/",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "atendente"])],
      schema: {
        description: "Cadastra um novo cliente no NullBank.",
        tags: ["clientes"],
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo", examples: ["atendente"] } },
          required: ["x-user-role"]
        },
        body: {
          ...clienteBodySchema,
          required: [
            "cpf", "nome_completo", "rg", "orgao_emissor", "uf_rg", "data_nascimento",
            "tipo_logradouro", "nome_logradouro", "numero", "bairro", "cep", "cidade", "estado"
          ]
        },
        response: {
          201: {
            type: "object",
            description: "Cliente criado com sucesso.",
            properties: {
              cpf: { type: "string" },
              nome_completo: { type: "string" },
              message: { type: "string" }
            }
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
            examples: [{ error: "Este CPF já está cadastrado no sistema." }]
          }
        }
      }
    },
    clientesService.createCliente
  );

  // 2. Atualizar Cliente (PUT)
  app.put(
    "/:cpf",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "atendente"])],
      schema: {
        description: "Atualiza os dados cadastrais de um cliente existente usando o CPF.",
        tags: ["clientes"],
        params: paramsCpfSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo", examples: ["Gerente"] } },
          required: ["x-user-role"]
        },
        body: clienteBodySchema,
        response: {
          200: {
            type: "object",
            properties: { message: { type: "string" } }
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } }
          }
        }
      }
    },
    clientesService.updateCliente
  );

  // 3. Remover Cliente (DELETE)
  app.delete(
    "/:cpf",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])], // Restrito a cargos mais altos por segurança operacional
      schema: {
        description: "Remove o registro de um cliente (Bloqueado caso possua contas bancárias vinculadas).",
        tags: ["clientes"],
        params: paramsCpfSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo", examples: ["DBA"] } },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "object",
            properties: { message: { type: "string" } }
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
            examples: [{ error: "Não é possível remover o cliente pois ele está vinculado como titular de uma conta bancária ativa." }]
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } }
          }
        }
      }
    },
    clientesService.deleteCliente
  );

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