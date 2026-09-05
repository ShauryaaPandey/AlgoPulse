import type { ParsedArgs } from './parser.js';
import { signupCommand } from './commands/signup.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { meCommand } from './commands/me.js';

export function printUsage(): void {
  console.log('AlgoPulse - Competitive Programming CLI Companion\n');
  console.log('Usage:');
  console.log('  algopulse <command> [options]\n');
  console.log('Commands:');
  console.log('  signup      Create a new AlgoPulse account');
  console.log('  login       Log in to your account');
  console.log('  logout      Log out of your current session');
  console.log('  me          View your profile and connected platforms');
  console.log('  help        Show available commands and usage\n');
}

export async function route(parsed: ParsedArgs): Promise<void> {
  if (parsed.flags['help'] || parsed.flags['h'] || parsed.command === 'help') {
    printUsage();
    return;
  }

  if (!parsed.command) {
    printUsage();
    return;
  }

  switch (parsed.command) {
    case 'signup':
      await signupCommand();
      break;
    case 'login':
      await loginCommand();
      break;
    case 'logout':
      await logoutCommand();
      break;
    case 'me':
      await meCommand();
      break;
    default:
      console.error(`Unknown command: "${parsed.command}"\n`);
      printUsage();
      process.exitCode = 1;
      break;
  }
}
