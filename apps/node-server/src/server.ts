import { createApp } from './app';
import { config, logger } from '@brainule/shared';

const app = createApp();

app.listen(config.port, () => {
  logger.info('Brainule server started', { port: config.port, env: config.nodeEnv });
});
