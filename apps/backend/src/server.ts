import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createContainer } from './container.js';

const env = loadEnv();
const container = await createContainer(env);

createApp(container).listen(env.PORT, () => {
  console.log(`[saferoute] API listening on http://localhost:${env.PORT}`);
  console.log(`[saferoute] providers: ${JSON.stringify(container.providers)}`);
});
