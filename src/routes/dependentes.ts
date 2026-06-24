import { FastifyPluginAsync } from "fastify";
import { DependentesService } from "../services/dependentes";

export const dependentesRoutes: FastifyPluginAsync = async (app) => {
  const dependentesService = new DependentesService();

  const verificarAcesso = (rolesPermitidas: string[]) => {
    return async (request: any, reply: any) => {
      const userRole = request.headers["x-user-role"] as string;
      if (!userRole || !rolesPermitidas.includes(userRole)) {
        return reply.status(403).send({ error: "Acesso negado. Permissão insuficiente." });
      }
    };
  };

  const paramsIdDependenteSchema = {
    type: 'object',
    properties: {
      id: { 
        type: 'integer', 
        description: 'ID identificador único (id_dependente)',
        examples: [1] 
      }
    },
    required: ['id']
  };

  const dependenteBodySchema = {
    type: "object",
    properties: {
      fk_matricula: { type: "string", maxLength: 20, description: "Matrícula do funcionário vinculado", examples: ["F2026-93"] },
      nome_completo: { type: "string", maxLength: 150, description: "Nome completo do dependente", examples: ["Mariana Santos"] },
      data_nascimento: { type: "string", format: "date", description: "Data de nascimento (YYYY-MM-DD)", examples: ["2018-05-20"] },
      parentesco: { 
        type: "string", 
        enum: ["filho(a)", "cônjuge", "genitor(a)"], 
        description: "Grau de parentesco conforme o ENUM do banco", 
        examples: ["filho(a)"] 
      }
    }
  };

  // 1. Inserir Dependente (POST)
  app.post(
    "/",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Vincula um novo dependente a um funcionário ativo.",
        tags: ["dependentes"],
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo (Requer: DBA ou Gerente)", examples: ["Gerente"] } },
          required: ["x-user-role"]
        },
        body: {
          ...dependenteBodySchema,
          required: ["fk_matricula", "nome_completo", "data_nascimento", "parentesco"]
        },
        response: {
          201: {
            type: "object",
            description: "Dependente cadastrado com sucesso.",
            properties: {
              id_dependente: { type: "integer" },
              fk_matricula: { type: "string" },
              nome_completo: { type: "string" },
              message: { type: "string" }
            }
          },
          400: {
            type: "object",
            description: "Erro de validação (Matrícula inexistente ou nome duplicado para o mesmo funcionário).",
            properties: { error: { type: "string" } },
            examples: [{ error: "Este funcionário já possui um dependente cadastrado com este mesmo nome." }]
          }
        }
      }
    },
    dependentesService.createDependente
  );

  // 2. Atualizar Dependente (PUT)
  app.put(
    "/:id",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Atualiza os dados de um dependente cadastrado através do seu ID.",
        tags: ["dependentes"],
        params: paramsIdDependenteSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo (Requer: DBA ou Gerente)", examples: ["DBA"] } },
          required: ["x-user-role"]
        },
        body: dependenteBodySchema,
        response: {
          200: {
            type: "object",
            description: "Dados atualizados com sucesso.",
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
    dependentesService.updateDependente
  );

  // 3. Remover Dependente (DELETE)
  app.delete(
    "/:id",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Remove o vínculo do dependente do sistema.",
        tags: ["dependentes"],
        params: paramsIdDependenteSchema,
        headers: {
          type: "object",
          properties: { "x-user-role": { type: "string", description: "Cargo (Requer: DBA ou Gerente)", examples: ["Gerente"] } },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "object",
            description: "Dependente removido com sucesso.",
            properties: { message: { type: "string" } }
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } }
          }
        }
      }
    },
    dependentesService.deleteDependente
  );
};