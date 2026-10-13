import { defineConfig } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  // One worker: the tests share one server and one CPU. Parallel runs made the game tests time out.
  workers: 1,
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}/game`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
