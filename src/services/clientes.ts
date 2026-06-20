import { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../database";

export class ClientesService {

    index = async (request: FastifyRequest, reply: FastifyReply) => {
        
        reply.status(200).send({ exemplo: "Exemplo!" });

    }

}