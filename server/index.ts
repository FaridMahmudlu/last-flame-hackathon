import { createGameServer } from './server';

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
const server = createGameServer({
  port,
  host: process.env.HOST ?? '0.0.0.0',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map((origin: string) => origin.trim()).filter(Boolean),
});

server.listen().then((boundPort) => {
  console.log(`Last Flame is listening on http://localhost:${boundPort}`);
  console.log('Use the same LAN game server for every phone. Internet hosting requires HTTPS/WSS.');
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'The game server could not start.');
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void server.close().then(() => process.exit(0)); });
}
