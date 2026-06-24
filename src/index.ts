import { app } from "./app";
import { env } from "./shared/env"

app.listen({ port: env.APP_PORT, host: env.APP_HOST }, function (err, address) {
  
  if (err) {

    app.log.error(err);
    process.exit(1);

  }

  console.log(`Server listen on ${env.APP_HOST}:${env.APP_PORT}`);

});