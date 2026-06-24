import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { AgenciasService } from "../services/agencias";

export const agenciasRoutes: FastifyPluginAsync = async (app) => {
  const agenciasService = new AgenciasService();

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

  const paramsAgenciaSchema = {
    type: 'object',
    properties: {
      id: { type: 'integer', description: 'Número de identificação da agência (num_ag)' }
    },
    required: ['id']
  };

  // Schema para validação e documentação dos dados de entrada de uma agência
  const agenciaBodySchema = {
    type: "object",
    properties: {
      nome_ag: { type: "string", maxLength: 256, description: "Nome da agência bancária" },
      cidade: { type: "string", maxLength: 256, description: "Cidade onde a agência está localizada" },
      sal_total: { type: "number", minimum: 0, default: 0, description: "Salário total acumulado da agência" }
    }
  };

  // 7. Criar uma nova agência (Consulta/Manutenção - Exclusivo DBA)
  app.post(
    "/",
    {
      preHandler: [verificarAcesso(["DBA"])], 
      schema: {
        description: "Insere uma nova agência bancária no sistema. Operação restrita ao administrador.",
        tags: ["agencias"],
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA))" }
          },
          required: ["x-user-role"]
        },
        body: {
          ...agenciaBodySchema,
          required: ["nome_ag", "cidade"]
        },
        response: {
          201: {
            type: "object",
            description: "Agência criada com sucesso.",
            properties: {
              id: { type: "integer", description: "Código gerado pelo banco (num_ag)" },
              nome_ag: { type: "string" },
              cidade: { type: "string" },
              sal_total: { type: "number" },
              message: { type: "string" }
            }
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          403: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } }
        }
      }
    },
    agenciasService.createAgencia
  );

  // 8. Atualizar uma agência existente (ALTERAÇÃO - REVISADO: Exclusivo DBA)
  app.put(
    "/:id",
    {
      preHandler: [verificarAcesso(["DBA"])], 
      schema: {
        description: "Atualiza os dados de uma agência existente. Operação restrita ao Administrador/DBA.",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA))" }
          },
          required: ["x-user-role"]
        },
        body: agenciaBodySchema,
        response: {
          200: {
            type: "object",
            description: "Agência atualizada com sucesso.",
            properties: {
              message: { type: "string" }
            }
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          403: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } }
        }
      }
    },
    agenciasService.updateAgencia
  );

  // 9. Remover uma agência (REMOÇÃO - Exclusivo DBA)
  app.delete(
    "/:id",
    {
      preHandler: [verificarAcesso(["DBA"])], 
      schema: {
        description: "Remove uma agência bancária do sistema (Caso não existam restrições de chave estrangeira ativas).",
        tags: ["agencias"],
        params: paramsAgenciaSchema,
        headers: {
          type: "object",
          properties: {
            "x-user-role": { type: "string", description: "Cargo do usuário (Requer: Administrador (DBA))" }
          },
          required: ["x-user-role"]
        },
        response: {
          200: {
            type: "object",
            description: "Agência removida com sucesso.",
            properties: {
              message: { type: "string" }
            }
          },
          400: { type: "object", description: "Bloqueado por restrição ON DELETE RESTRICT.", properties: { error: { type: "string" } } },
          403: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } }
        }
      }
    },
    agenciasService.deleteAgencia
  );
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