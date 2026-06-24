import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

export class ClientesService {

    createCliente = async (request: FastifyRequest, reply: FastifyReply) => {
        const {
        cpf, nome_completo, rg, orgao_emissor, uf_rg, data_nascimento,
        tipo_logradouro, nome_logradouro, numero, complemento, bairro, cep, cidade, estado
        } = request.body as any;

        try {
        const query = `
            INSERT INTO cliente (
            cpf, nome_completo, rg, orgao_emissor, uf_rg, data_nascimento,
            tipo_logradouro, nome_logradouro, numero, complemento, bairro, cep, cidade, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.query(query, [
            cpf, nome_completo, rg, orgao_emissor, uf_rg, data_nascimento,
            tipo_logradouro, nome_logradouro, numero, complemento || null, bairro, cep, cidade, estado
        ]);

        return reply.status(201).send({
            cpf,
            nome_completo,
            message: "Cliente cadastrado com sucesso."
        });
        } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return reply.status(400).send({ error: "Este CPF já está cadastrado no sistema." });
        }
        return reply.status(500).send({ error: "Erro interno ao cadastrar cliente." });
        }
    };

    // PUT /api/clientes/:cpf
    updateCliente = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };
        const body = request.body as any;

        try {
        const campos: string[] = [];
        const valores: any[] = [];

        Object.keys(body).forEach((key) => {
            if (body[key] !== undefined) {
            campos.push(`${key} = ?`);
            valores.push(body[key]);
            }
        });

        if (campos.length === 0) {
            return reply.status(400).send({ error: "Nenhum campo informado para atualização." });
        }

        valores.push(cpf);

        const query = `UPDATE cliente SET ${campos.join(", ")} WHERE cpf = ?`;
        const [result] = await pool.query(query, valores);

        if ((result as any).affectedRows === 0) {
            return reply.status(404).send({ error: "Cliente não encontrado." });
        }

        return reply.status(200).send({ message: "Dados do cliente atualizados com sucesso." });
        } catch (error) {
        return reply.status(500).send({ error: "Erro interno ao atualizar cliente." });
        }
    };

    // DELETE /api/clientes/:cpf
    deleteCliente = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };

        try {
        const query = `DELETE FROM cliente WHERE cpf = ?`;
        const [result] = await pool.query(query, [cpf]);

        if ((result as any).affectedRows === 0) {
            return reply.status(404).send({ error: "Cliente não encontrado." });
        }

        return reply.status(200).send({ message: "Cliente removido com sucesso." });
        } catch (error: any) {
        // Captura o bloqueio da FK em 'titularidade' (ON DELETE RESTRICT)
        if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
            return reply.status(400).send({ 
            error: "Não é possível remover o cliente pois ele está vinculado como titular de uma conta bancária ativa." 
            });
        }
        return reply.status(500).send({ error: "Erro interno ao remover cliente." });
        }
    };

    getContasCliente = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };

        try {
            const query = `
            SELECT cb.num_conta, cb.tipo_conta, cb.saldo, a.nome_ag AS agencia, f.nome_completo AS gerente
            FROM conta_bancaria cb
            JOIN titularidade t ON cb.num_conta = t.fk_num_conta
            JOIN agencia a ON cb.fk_num_ag = a.num_ag
            JOIN funcionario f ON cb.fk_matricula_gerente = f.matricula
            WHERE t.fk_cpf_cliente = ?
            `;
            const [rows] = await pool.query(query, [cpf]);
            return reply.status(200).send(rows);
        } catch (error) {
            return reply.status(500).send({ error: "Erro ao buscar contas do cliente" });
        }
    };

    getContasConjuntas = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };

        try {
            const query = `
            SELECT c.nome_completo, c.cpf, t2.fk_num_conta AS num_conta
            FROM titularidade t1
            JOIN titularidade t2 ON t1.fk_num_conta = t2.fk_num_conta AND t1.fk_cpf_cliente != t2.fk_cpf_cliente
            JOIN cliente c ON t2.fk_cpf_cliente = c.cpf
            WHERE t1.fk_cpf_cliente = ?
            `;
            const [rows] = await pool.query(query, [cpf]);
            return reply.status(200).send(rows);
        } catch (error) {
            return reply.status(500).send({ error: "Erro ao buscar contas conjuntas" });
        }
    };

    getContasCorrentesMovimentadas = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };
        const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

        if (!periodo) {
            return reply.status(400).send({ error: "Parâmetro 'período' obrigatório" });

        }
        const dias = parseInt(periodo.replace("d", ""), 10);

        try {
            const query = `
            SELECT cb.num_conta, COUNT(tr.num_transacao) AS total_transacoes
            FROM conta_bancaria cb
            JOIN titularidade t ON cb.num_conta = t.fk_num_conta
            JOIN transacao tr ON cb.num_conta = tr.fk_num_conta
            WHERE t.fk_cpf_cliente = ? AND cb.tipo_conta = 'conta-corrente' AND tr.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY cb.num_conta
            ORDER BY total_transacoes DESC
            `;
            const [rows] = await pool.query(query, [cpf, dias]);
            return reply.status(200).send(rows);
        } catch (error) {

        }
    };

    getContasMaiorVolume = async (request: FastifyRequest, reply: FastifyReply) => {
        const { cpf } = request.params as { cpf: string };
        const { periodo } = request.query as { periodo: "7d" | "30d" | "365d" };

        if (!periodo) {
            return reply.status(400).send({ error: "Parâmetro 'período' obrigatório" });
        }
        const dias = parseInt(periodo.replace("d", ""), 10);

        try {
            const query = `
            SELECT cb.num_conta, SUM(ABS(tr.valor)) AS volume_total
            FROM conta_bancaria cb
            JOIN titularidade t ON cb.num_conta = t.fk_num_conta
            JOIN transacao tr ON cb.num_conta = tr.fk_num_conta
            WHERE t.fk_cpf_cliente = ? AND tr.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY cb.num_conta
            ORDER BY volume_total DESC
            `;
            const [rows] = await pool.query(query, [cpf, dias]);
            return reply.status(200).send(rows);
        } catch (error) {
            return reply.status(500).send({ error: "Erro ao buscar contas com maior volume de transações" });
        }
    };
}