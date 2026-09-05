import { promptText, promptPassword, closePrompt } from '../prompt.js';
import { authService } from '../../auth/auth-service.js';

export async function signupCommand(): Promise<void> {
  try {
    const name = await promptText('Name: ');
    const email = await promptText('Email: ');
    const password = await promptPassword('Password: ');
    const confirmPassword = await promptPassword('Confirm Password: ');

    if (!name || !email || !password) {
      console.error('✗ All fields are required.');
      process.exitCode = 1;
      return;
    }

    if (password !== confirmPassword) {
      console.error('✗ Passwords do not match.');
      process.exitCode = 1;
      return;
    }

    await authService.signup(name, email, password);
    console.log('✓ Account created successfully.');
    console.log('✓ You are now logged in.');
  } catch (error: any) {
    console.error(`✗ ${error.message || 'Signup failed.'}`);
    process.exitCode = 1;
  } finally {
    closePrompt();
  }
}
