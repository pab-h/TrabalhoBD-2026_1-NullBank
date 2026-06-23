import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { AgenciasService } from "../services/agencias";

export const agenciasRoutes: FastifyPluginAsync = async (app) => {
  const agenciasService = new AgenciasService();

  // Middleware para simular o controle de acesso baseado nas roles
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

  // Parâmetro de rota padrão (:id) mapeando para o número da agência (num_ag)
  const paramsAgenciaSchema = {
    type: 'object',
    properties: {
      id: { type: 'integer', description: 'Número de identificação da agência (num_ag)' }
    },
    required: ['id']
  };

  // 1. Funcionários da agência
  app.get(
    "/:id/funcionarios",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Retorna a lista de funcionários de uma agência específica, com seus respectivos cargos, endereços concatenados, salários e quantidade total de dependentes cadastrados.",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        querystring: {
          type: "object",
          properties: {
            ordenarPor: { 
              type: "string", 
              enum: ["nome", "salario"], 
              default: "nome",
              description: "Campo pelo qual a lista será ordenada (f.nome_completo ou f.salario)."
            }
          }
        },
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA) ou Gerente)" }
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string", description: "Nome completo do funcionário" },
                cargo: { type: "string", enum: ["gerente", "atendente", "caixa"] },
                endereco: { type: "string", description: "Endereço completo estruturado via CONCAT" },
                salario: { type: "number" },
                quantidade_dependentes: { type: "integer", description: "Total de registros na tabela dependente para este funcionário" }
              }
            }
          }
        }
      }
    },
    agenciasService.getFuncionarios
  );

  // 2. Clientes vinculados à agência
app.get(
    "/:id/clientes",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "Atendente"])],
      schema: {
        description: "Retorna os clientes vinculados à agência informada através da titularidade de suas contas, agrupados e classificados de forma automática pelo tipo de conta.",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA), Gerente ou Atendente)" }
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "object",
            properties: {
              "conta-corrente": {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nome: { type: "string" }
                  }
                }
              },
              "poupança": {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nome: { type: "string" }
                  }
                }
              },
              "conta especial": {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nome: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    agenciasService.getClientes
  );

  // 3. Contas especiais devedoras
  app.get(
    "/:id/contas/especiais-devedoras",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Lista todas as contas do tipo 'conta especial' pertencentes à agência que possuem saldo negativo (< 0), ordenadas de forma decrescente do maior saldo devedor para o menor.",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA) ou Gerente)" }
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                num_conta: { type: "integer", description: "Número identificador único da conta" },
                saldo: { type: "number", description: "Saldo devedor atualizado" }
              }
            }
          }
        }
      }
    },
    agenciasService.getContasEspeciaisDevedoras
  );

  // 4. Contas poupanças positivas
  app.get(
    "/:id/contas/poupancas-positivas",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente", "Atendente"])],
      schema: {
        description: "Lista as contas do tipo 'poupança' pertencentes à agência que possuem saldo positivo ou igual a zero (>= 0), retornando-as de maneira classificada de forma decrescente pelo saldo.",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA), Gerente ou Atendente)" }
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                num_conta: { type: "integer" },
                saldo: { type: "number" }
              }
            }
          }
        }
      }
    },
    agenciasService.getContasPoupancasPositivas
  );

  // 5. Contas correntes mais movimentadas
  app.get(
    "/:id/contas/correntes-movimentadas",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Lista as contas do tipo 'conta-corrente' com o maior número de transações efetuadas na tabela 'transacao' dentro de uma janela temporal específica.",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        querystring: {
          type: "object",
          properties: {
            periodo: { 
              type: "string", 
              enum: ["7d", "30d", "365d"],
              description: "Janela temporal calculada retroativamente a partir do CURRENT_TIMESTAMP (MySQL: DATE_SUB)." 
            }
          },
          required: ["periodo"]
        },
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA) ou Gerente)" }
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                num_conta: { type: "integer" },
                total_transacoes: { type: "integer", description: "Quantidade total de transações mapeadas no período selecionado" }
              }
            }
          }
        }
      }
    },
    agenciasService.getContasCorrentesMovimentadas
  );

  // 6. Contas com maior volume financeiro
  app.get(
    "/:id/contas/maior-volume",
    {
      preHandler: [verificarAcesso(["DBA", "Gerente"])],
      schema: {
        description: "Lista as contas bancárias da agência que obtiveram o maior volume financeiro total acumulado (soma do valor absoluto de todas as movimentações) no período selecionado.",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        querystring: {
          type: "object",
          properties: {
            periodo: { 
              type: "string", 
              enum: ["7d", "30d", "365d"],
              description: "Janela temporal filtrada." 
            }
          },
          required: ["periodo"]
        },
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA) ou Gerente)" }
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                num_conta: { type: "integer" },
                volume_total: { type: "number", description: "Soma absoluta das transações efetuadas (SUM(ABS(valor)))" }
              }
            }
          }
        }
      }
    },
    agenciasService.getContasMaiorVolume
  );
};