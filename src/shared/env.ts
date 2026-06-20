import { config } from 'dotenv';
import { z }      from 'zod';

config({ override: true });

const envSchema = z.object({

    APP_PORT: z.coerce.number(),
    APP_HOST: z.string(),

    CORS_ORIGIN: z.string(),

    DB_HOST:     z.string(),
    DB_PORT:     z.coerce.number(),
    DB_USER:     z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME:     z.string()

});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    
  console.error(_env.error);

  throw new Error('Invalid environment variables');

}

export const env = _env.data;