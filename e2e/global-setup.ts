import { execSync } from "node:child_process";
import { test as setup } from "@playwright/test";

setup("seed database", async () => {
  console.log("Seeding database for e2e tests…");
  execSync("pnpm db:seed", { stdio: "inherit" });
});
