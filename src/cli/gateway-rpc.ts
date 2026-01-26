import type { Command } from "commander";
import { callGateway } from "../gateway/call.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.js";
import { withProgress } from "./progress.js";

export type GatewayRpcOpts = {
  url?: string;
  token?: string;
  timeout?: string;
  expectFinal?: boolean;
  json?: boolean;
};

export function addGatewayClientOptions(cmd: Command) {
  return cmd
    .option("--url <url>", "网关 WebSocket URL（配置时默认为 gateway.remote.url）")
    .option("--token <token>", "网关令牌（如果需要）")
    .option("--timeout <ms>", "Timeout in ms", "10000")
    .option("--expect-final", "等待最终响应（智能体）", false);
}

export async function callGatewayFromCli(
  method: string,
  opts: GatewayRpcOpts,
  params?: unknown,
  extra?: { expectFinal?: boolean; progress?: boolean },
) {
  const showProgress = extra?.progress ?? opts.json !== true;
  return await withProgress(
    {
      label: `Gateway ${method}`,
      indeterminate: true,
      enabled: showProgress,
    },
    async () =>
      await callGateway({
        url: opts.url,
        token: opts.token,
        method,
        params,
        expectFinal: extra?.expectFinal ?? Boolean(opts.expectFinal),
        timeoutMs: Number(opts.timeout ?? 10_000),
        clientName: GATEWAY_CLIENT_NAMES.CLI,
        mode: GATEWAY_CLIENT_MODES.CLI,
      }),
  );
}
