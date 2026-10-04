import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CANVAS_ROOT = path.resolve(SCRIPT_DIR, "..");
const REQUIRED_SDK_PACKAGES = [
  "openhands-agent-server",
  "openhands-sdk",
  "openhands-tools",
  "openhands-workspace",
];

export function resolveResearchHarnessConfig({
  env = process.env,
  canvasRoot = CANVAS_ROOT,
  pathExists = existsSync,
} = {}) {
  const sdkPath = path.resolve(
    env.OH_AGENT_SERVER_LOCAL_PATH ||
      path.join(canvasRoot, "..", "openhands-research-harness"),
  );

  const missingPackages = REQUIRED_SDK_PACKAGES.filter(
    (packageName) => !pathExists(path.join(sdkPath, packageName)),
  );
  if (missingPackages.length > 0) {
    throw new Error(
      `Research SDK checkout is incomplete at ${sdkPath}. Missing: ${missingPackages.join(", ")}`,
    );
  }

  const runtime = env.OH_CONVERSATION_RUNTIME || "local";
  if (!new Set(["local", "docker"]).has(runtime)) {
    throw new Error(
      `OH_CONVERSATION_RUNTIME must be 'local' or 'docker', got '${runtime}'`,
    );
  }
  if (runtime === "docker" && !env.OH_CONVERSATION_IMAGE) {
    throw new Error(
      "Docker mode requires OH_CONVERSATION_IMAGE built from the research SDK fork.",
    );
  }

  return {
    ...env,
    OH_AGENT_SERVER_LOCAL_PATH: sdkPath,
    OH_CONVERSATION_RUNTIME: runtime,
    UV_PYTHON: env.UV_PYTHON || "3.12",
    VITE_WORKING_DIR: path.resolve(env.VITE_WORKING_DIR || sdkPath),
  };
}

export function startResearchHarness(options = {}) {
  const env = resolveResearchHarnessConfig(options);
  const launcherArguments = options.argv ?? process.argv.slice(2);
  const child = spawn(
    process.execPath,
    [
      path.join(CANVAS_ROOT, "scripts", "dev-with-automation.mjs"),
      ...launcherArguments,
    ],
    {
      cwd: CANVAS_ROOT,
      env,
      stdio: "inherit",
    },
  );
  child.on("error", (error) => {
    console.error(`Could not start the research harness: ${error.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });
  return child;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    startResearchHarness();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
