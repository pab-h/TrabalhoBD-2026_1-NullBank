import { FastifyPluginAsync } from "fastify";
import { ContasBancariasService } from "../services/contas";

export const contasRoutes: FastifyPluginAsync = async (app) => {
  const contasBancariasService = new ContasBancariasService();

  const verificarAcesso = (rolesPermitidas: string[]) => {
    return async (request: any, reply: any) => {
      const userRole = request.headers["x-user-role"] as string;
      if (!userRole || !rolesPermitidas.includes(userRole)) {
        return reply.status(403).send({ error: "Acesso negado. Permissão insuficiente." });
      }
    };
  };

  const paramsContaSchema = {
    type: 'object',
    properties: {
      num_conta: { 
        type: 'integer', 
        description: 'Número de identificação único da conta bancária', 
        examples: [1024] 
      }
    },
    required: ['num_conta']
  };

  const contaBodySchema = {
    type: "object",
    properties: {
      senha: { type: "string", minLength: 4, maxLength: 255, description: "Senha de acesso da conta", examples: ["c0nt4S3nh4"] },
      tipo_conta: { 
        type: "string", 
        enum: ["conta-corrente", "poupança", "conta especial"], 
        description: "Tipo de conta conforme ENUM do banco", 
        examples: ["conta-corrente"] 
      },
      fk_num_ag: { type: "integer", description: "Código identificador da agência vinculada", examples: [1] },
      fk_matricula_gerente: { type: "string", maxLength: 20, description: "Matrícula do funcionário gerente da conta", examples: ["F2026-93"] },
      taxa_juros: { type: "number", minimum: 0, maximum: 100, description: "Taxa de juros (aplicável a poupança/especial)", examples: [0.5] },
      limite_credito: { type: "number", minimum: 0, description: "Limite de crédito (aplicável a conta especial)", examples: [5000.00] },
      data_aniversario_contrato: { type: "string", format: "date", description: "Data de aniversário do contrato (YYYY-MM-DD)", examples: ["2026-06-23"] }
    }
  };

  // 1. Inserir Conta Bancária (POST)
  app.post(
    "/",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Abre uma nova conta bancária vinculada a uma agência e um gerente específicos.",
        tags: ["contas"],
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo autorizado", examples: ["Gerente"] } },
          required: ["x-user-role"]
        },
        body: {
          ...contaBodySchema,
          required: ["senha", "tipo_conta", "fk_num_ag", "fk_matricula_gerente"]
        },
        response: {
          201: {
            type: "object",
            description: "Conta aberta com sucesso.",
            properties: {
              num_conta: { type: "integer" },
              tipo_conta: { type: "string" },
              saldo: { type: "number" },
              message: { type: "string" }
            }
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
            examples: [{ error: "Erro de integridade. A agência ou a matrícula do gerente informada não existe." }]
          }
        }
      }
    },
    contasBancariasService.createConta
  );

  // 2. Atualizar Conta Bancária (PUT)
  app.put(
    "/:num_conta",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Altera os parâmetros cadastrais, senhas ou limites de uma conta existente.",
        tags: ["contas"],
        params: paramsContaSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo autorizado", examples: ["Gerente"] } },
          required: ["x-user-role"]
        },
        body: contaBodySchema, // Todos opcionais no PUT para alterações pontuais
        response: {
          200: {
            type: "object",
            properties: { message: { type: "string" } }
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } }
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } }
          }
        }
      }
    },
    contasBancariasService.updateConta
  );

  // 3. Remover Conta Bancária (DELETE)
  app.delete(
    "/:num_conta",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Encerra e remove o registro de uma conta bancária do sistema (Impedido caso contenha transações ativas).",
        tags: ["contas"],
        params: paramsContaSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo autorizado", examples: ["DBA"] } },
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
            examples: [{ error: "Não é possível remover a conta bancária pois existem transações ou registros de titularidade vinculados a ela." }]
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } }
          }
        }
      }
    },
    contasBancariasService.deleteConta
  );
};