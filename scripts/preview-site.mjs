import { startSiteServer } from "../tests/helpers/site-server.mjs";

const server = await startSiteServer();
console.log(`Local preview: ${server.url}`);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => { await server.close(); process.exit(0); });
}
