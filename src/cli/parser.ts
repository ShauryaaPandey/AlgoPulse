export interface ParsedArgs {
  command: string | null;
  subcommand: string | null;
  args: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(rawArgs: string[] = process.argv.slice(2)): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (!arg) continue;

    if (arg.startsWith('--')) {
      const stripped = arg.slice(2);
      if (stripped.startsWith('no-')) {
        flags[stripped.slice(3)] = false;
      } else if (stripped.includes('=')) {
        const [key, ...rest] = stripped.split('=');
        if (key) {
          flags[key] = rest.join('=');
        }
      } else {
        flags[stripped] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const stripped = arg.slice(1);
      if (stripped.includes('=')) {
        const [key, ...rest] = stripped.split('=');
        if (key) {
          flags[key] = rest.join('=');
        }
      } else {
        flags[stripped] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  const command = positional[0] ?? null;
  const subcommand = positional[1] ?? null;
  const args = positional.slice(2);

  return {
    command,
    subcommand,
    args,
    flags,
  };
}
