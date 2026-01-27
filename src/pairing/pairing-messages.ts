import { formatCliCommand } from "../cli/command-format.js";
import type { PairingChannel } from "./pairing-store.js";

export function buildPairingReply(params: {
  channel: PairingChannel;
  idLine: string;
  code: string;
}): string {
  const { channel, idLine, code } = params;
  return [
    "Clawdbot: 访问未配置。",
    "",
    idLine,
    "",
    `配对码: ${code}`,
    "",
    "请让机器人所有者执行以下命令批准:",
    formatCliCommand(`clawdbot pairing approve ${channel} <code>`),
  ].join("\n");
}
