const { createApp } = require('./app');
const { connectDb } = require('./config/db');
const { env } = require('./config/env');

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, env.host, () => {
    // eslint-disable-next-line no-console
    console.log(`GigBudget API listening on http://${env.host}:${env.port}`);
    // eslint-disable-next-line no-console
    console.log('Use LAN IP (not localhost) when testing from a physical phone.');
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API', err);
  process.exit(1);
});
