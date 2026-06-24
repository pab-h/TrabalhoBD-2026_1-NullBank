import { FastifyPluginAsync } from "fastify";
import { FuncionariosService } from "../services/funcionarios";

export const funcionariosRoutes: FastifyPluginAsync = async (app) => {
  const funcionariosService = new FuncionariosService();

  // Middleware para controle de acesso baseado nas roles do cabeçalho
  const verificarAcesso = (rolesPermitidas: string[]) => {
    return async (request: any, reply: any) => {
      const userRole = request.headers["x-user-role"] as string;
      if (!userRole || !rolesPermitidas.includes(userRole)) {
        return reply.status(403).send({ 
          error: "Acesso negado. Você não tem permissão para acessar este recurso." 
        });
      }
    };
  };

  // Schema de parâmetros para rotas que usam a matrícula do funcionário
  const paramsMatriculaSchema = {
    type: 'object',
    properties: {
      matricula: { 
        type: 'string', 
        description: 'Matrícula única de identificação do funcionário',
        example: 'F2026-93' 
      }
    },
    required: ['matricula']
  };

  // Schema base do funcionário com exemplos preenchidos conforme a modelagem SQL
  const funcionarioBodySchema = {
    type: "object",
    properties: {
      matricula: { type: "string", maxLength: 20, example: "F2026-93" },
      nome_completo: { type: "string", maxLength: 150, example: "Carlos Eduardo Santos" },
      senha: { type: "string", description: "Senha de acesso (criptografada em Hash)", example: "mypass123" },
      tipo_logradouro: { type: "string", maxLength: 20, example: "Rua" },
      nome_logradouro: { type: "string", maxLength: 100, example: "Anísio de Abreu" },
      numero: { type: "string", maxLength: 10, example: "450" },
      complemento: { type: "string", maxLength: 50, example: "Apto 302" },
      bairro: { type: "string", maxLength: 50, example: "Centro" },
      cidade: { type: "string", maxLength: 100, example: "Sobral" },
      estado: { type: "string", minLength: 2, maxLength: 2, example: "CE" },
      cep: { type: "string", minLength: 8, maxLength: 8, example: "62010000" },
      cargo: { type: "string", enum: ["gerente", "atendente", "caixa"], example: "caixa" },
      genero: { type: "string", enum: ["masculino", "feminino", "não-binário"], example: "masculino" },
      data_nascimento: { type: "string", format: "date", description: "Formato YYYY-MM-DD", example: "1994-08-15" },
      salario: { type: "number", minimum: 2286.00, description: "Salário (Mínimo: R$ 2286,00)", example: 2500.00 },
      fk_num_ag: { type: "integer", description: "Número da agência de alocação", example: 1 }
    }
  };

  // 1. Inserir Funcionário (POST)
  app.post(
    "/",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])], // Alinhado ao controle gerencial/DBA do PDF
      schema: {
        description: "Cadastra um novo funcionário no sistema NullBank respeitando o piso salarial.",
        tags: ["funcionarios"],
        headers: {
          type: "object",
          properties: { 
            "x-user-role": { type: "string", description: "Cargo (Requer: DBA ou Gerente)", example: "DBA" } 
          },
          required: ["x-user-role"]
        },
        body: {
          ...funcionarioBodySchema,
          required: [
            "matricula", "nome_completo", "senha", "tipo_logradouro", "nome_logradouro",
            "numero", "bairro", "cidade", "estado", "cep", "cargo", "genero", 
            "data_nascimento", "salario", "fk_num_ag"
          ]
        },
        response: {
          201: {
            type: "object",
            description: "Funcionário cadastrado com sucesso.",
            properties: {
              matricula: { type: "string" },
              nome_completo: { type: "string" },
              message: { type: "string" }
            },
            example: {
              matricula: "F2026-93",
              nome_completo: "Carlos Eduardo Santos",
              message: "Funcionário cadastrado com sucesso."
            }
          },
          400: {
            type: "object",
            description: "Erro de validação (ex: Salário abaixo do piso de R$ 2.286,00 ou Duplicidade).",
            properties: { error: { type: "string" } },
            example: { error: "Operação inválida. O salário não pode ser menor que o salário-base de R$ 2.286,00." }
          },
          403: {
            type: "object",
            properties: { error: { type: "string" } },
            example: { error: "Acesso negado. Você não tem permissão para acessar este recurso." }
          }
        }
      }
    },
    funcionariosService.createFuncionario
  );

  // 2. Atualizar Funcionário (PUT)
  app.put(
    "/:matricula",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Atualiza parcialmente ou totalmente os dados cadastrais ou salário de um funcionário.",
        tags: ["funcionarios"],
        params: paramsMatriculaSchema,
        headers: {
          type: "object",
          properties: { 
            "x-user-role": { type: "string", description: "Cargo (Requer: DBA ou Gerente)", example: "Gerente" } 
          },
          required: ["x-user-role"]
        },
        body: {
          ...funcionarioBodySchema,
          // No PUT os campos se tornam opcionais para permitir a atualização parcial
          required: []
        },
        response: {
          200: {
            type: "object",
            description: "Dados atualizados com sucesso.",
            properties: { message: { type: "string" } },
            example: { message: "Dados do funcionário atualizados com sucesso." }
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
            example: { error: "O salário não pode ser menor que o salário-base de R$ 2.286,00." }
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } },
            example: { error: "Funcionário não encontrado." }
          }
        }
      }
    },
    funcionariosService.updateFuncionario
  );

  // 3. Remover Funcionário (DELETE)
  app.delete(
    "/:matricula",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Remove um funcionário da base de dados (Impedido caso gerencie contas com cláusula RESTRICT).",
        tags: ["funcionarios"],
        params: paramsMatriculaSchema,
        headers: {
          type: "object",
          properties: { 
            "x-user-role": { type: "string", description: "Cargo (Requer: DBA ou Gerente)", example: "DBA" } 
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "object",
            description: "Funcionário removido com sucesso.",
            properties: { message: { type: "string" } },
            example: { message: "Funcionário removido com sucesso." }
          },
          400: {
            type: "object",
            description: "Erro de integridade referencial.",
            properties: { error: { type: "string" } },
            example: { error: "Não é possível remover o funcionário pois ele está vinculado como gerente de contas bancárias ativas." }
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } },
            example: { error: "Funcionário não encontrado." }
          }
        }
      }
    },
    funcionariosService.deleteFuncionario
  );
};