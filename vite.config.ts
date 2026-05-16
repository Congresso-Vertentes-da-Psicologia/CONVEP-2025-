import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig, type UserConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const sandboxProjectPathEnv = "DEV_SERVER__PROJECT_PATH";
const sandboxRuntimeEnv = "LOVABLE_SANDBOX";

function isSandboxEnvironment() {
  return process.env[sandboxRuntimeEnv] === "1" || Boolean(process.env[sandboxProjectPathEnv]);
}

function buildEnvDefine(mode: string) {
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");

  return Object.fromEntries(
    Object.entries(loadedEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );
}

export default defineConfig(({ command, mode }) => {
  const config: UserConfig = {
    define: buildEnvDefine(mode),
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: "::",
      port: 8080,
      strictPort: isSandboxEnvironment(),
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      command === "build" ? cloudflare({ viteEnvironment: { name: "ssr" } }) : null,
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      react(),
    ],
  };

  if (isSandboxEnvironment()) {
    return config;
  }

  return mergeConfig(config, {
    server: {
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      },
    },
  });
});