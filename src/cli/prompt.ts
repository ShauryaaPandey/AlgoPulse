import readline from 'node:readline';
import { Writable } from 'node:stream';

class MutedWritable extends Writable {
  public muted = false;

  override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (!this.muted) {
      process.stdout.write(chunk, encoding);
    } else {
      const str = chunk.toString();
      if (str === '\r' || str === '\n' || str === '\r\n') {
        process.stdout.write('\n');
      } else {
        process.stdout.write('*');
      }
    }
    callback();
  }
}

let sharedMutedStdout: MutedWritable | null = null;
let sharedRl: readline.Interface | null = null;

function getInterface(): { rl: readline.Interface; stdout: MutedWritable } {
  if (!sharedRl || !sharedMutedStdout) {
    sharedMutedStdout = new MutedWritable();
    sharedRl = readline.createInterface({
      input: process.stdin,
      output: sharedMutedStdout,
      terminal: Boolean(process.stdin.isTTY),
    });
  }
  return { rl: sharedRl, stdout: sharedMutedStdout };
}

export function promptText(question: string): Promise<string> {
  const { rl, stdout } = getInterface();
  stdout.muted = false;
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

export function promptPassword(question: string): Promise<string> {
  const { rl, stdout } = getInterface();
  stdout.muted = false;
  stdout.write(question);
  stdout.muted = true;
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      stdout.muted = false;
      resolve(answer.trim());
    });
  });
}

export function closePrompt(): void {
  if (sharedRl) {
    sharedRl.close();
    sharedRl = null;
    sharedMutedStdout = null;
  }
}
