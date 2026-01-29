export const send = {
  info: (message: string) => {
    process.stdout.write(`${JSON.stringify({ action: "info", message })}\n`);
  },
  warn: (message: string) => {
    process.stdout.write(`${JSON.stringify({ action: "warn", message })}\n`);
  },
  error: (error: Error) => {
    process.stdout.write(
      `${JSON.stringify({ action: "error", error: error?.toString() })}\n`,
    );
  },
  ready: () => {
    process.stdout.write(`${JSON.stringify({ action: "ready" })}\n`);
  },
  destroyed: (clientId: string) => {
    process.stdout.write(
      `${JSON.stringify({ action: "destroyed", clientId })}\n`,
    );
  },
};
