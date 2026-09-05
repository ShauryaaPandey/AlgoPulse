import { authService } from '../../auth/auth-service.js';

export async function logoutCommand(): Promise<void> {
  authService.logout();
  console.log('✓ You have been logged out.');
}
