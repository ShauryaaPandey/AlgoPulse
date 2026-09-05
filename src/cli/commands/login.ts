import { promptText, promptPassword, closePrompt } from '../prompt.js';
import { authService } from '../../auth/auth-service.js';

export async function loginCommand(): Promise<void> {
  try {
    const email = await promptText('Email: ');
    const password = await promptPassword('Password: ');

    if (!email || !password) {
      console.error('✗ Email and password are required.');
      process.exitCode = 1;
      return;
    }

    await authService.login(email, password);
    console.log('✓ Login successful.');
  } catch (error: any) {
    console.error(`✗ ${error.message || 'Login failed.'}`);
    process.exitCode = 1;
  } finally {
    closePrompt();
  }
}
