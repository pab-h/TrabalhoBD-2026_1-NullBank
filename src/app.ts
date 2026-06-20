import fastifySwagger   from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors      from '@fastify/cors';
import Fastify          from 'fastify'

import { env }    from './shared/env';
import { routes } from "./routes"; 

const app = Fastify({
  logger: true
});

app.register(fastifySwagger, {
  openapi: {
    info: {
      title:       "NullBank API",
      version:     '1.0.0',
      description: "Documentação da API do NullBank",
    },
    servers: [
      { 
        url:         'http://localhost:3000',
        description: 'Localhost server',
      },
    ],
    tags: [
      {
        name:        'agencias',
        description: 'Rotas para a consulta das agencias',
      },
      {
        name:        'clientes',
        description: 'Rotas para a consulta dos clientes',
      },
      { 
        name:        'views',
        description: 'Rotas para a consulta das views',
      },
      {
        name:        'transacoes',
        description: 'Rotas para a consulta das transações',
      },
    ],
  }
});

app.register(fastifySwaggerUi, {
  routePrefix: '/',
  theme: {
    title: "NullBank API - Documentação - Swagger Ui",
  },
});

app.register(fastifyCors, {
  origin:         env.CORS_ORIGIN,
  methods:        ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials:    true,
  maxAge:         3600,
});

app.register(routes);

export { app };