// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveResearchHarnessConfig } from "../../scripts/dev-research-harness.mjs";

const temporaryDirectories: string[] = [];

function createCheckout() {
  const root = mkdtempSync(path.join(tmpdir(), "openhands-research-"));
  temporaryDirectories.push(root);
  const canvasRoot = path.join(root, "openhands-research-canvas");
  const sdkRoot = path.join(root, "openhands-research-harness");
  mkdirSync(canvasRoot);
  for (const packageName of [
    "openhands-agent-server",
    "openhands-sdk",
    "openhands-tools",
    "openhands-workspace",
  ]) {
    mkdirSync(path.join(sdkRoot, packageName), { recursive: true });
  }
  return { canvasRoot, sdkRoot };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("research harness launcher", () => {
  it("uses the sibling SDK checkout and local runtime by default", () => {
    const { canvasRoot, sdkRoot } = createCheckout();

    const config = resolveResearchHarnessConfig({ env: {}, canvasRoot });

    expect(config.OH_AGENT_SERVER_LOCAL_PATH).toBe(sdkRoot);
    expect(config.OH_CONVERSATION_RUNTIME).toBe("local");
    expect(config.UV_PYTHON).toBe("3.12");
    expect(config.VITE_WORKING_DIR).toBe(sdkRoot);
  });

  it("rejects Docker isolation without a research SDK image", () => {
    const { canvasRoot } = createCheckout();

    expect(() =>
      resolveResearchHarnessConfig({
        env: { OH_CONVERSATION_RUNTIME: "docker" },
        canvasRoot,
      }),
    ).toThrow("Docker mode requires OH_CONVERSATION_IMAGE");
  });

  it("preserves an explicit Docker image and workspace", () => {
    const { canvasRoot } = createCheckout();
    const workspace = path.join(canvasRoot, "research-workspace");

    const config = resolveResearchHarnessConfig({
      env: {
        OH_CONVERSATION_IMAGE: "openhands-research-agent-server:local",
        OH_CONVERSATION_RUNTIME: "docker",
        UV_PYTHON: "3.13",
        VITE_WORKING_DIR: workspace,
      },
      canvasRoot,
    });
    const dockerConfig = config as Record<string, string | undefined>;

    expect(config.OH_CONVERSATION_RUNTIME).toBe("docker");
    expect(dockerConfig.OH_CONVERSATION_IMAGE).toBe(
      "openhands-research-agent-server:local",
    );
    expect(config.UV_PYTHON).toBe("3.13");
    expect(config.VITE_WORKING_DIR).toBe(workspace);
  });
});
