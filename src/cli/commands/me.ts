import { requireAuth } from '../../auth/middleware.js';

export async function meCommand(): Promise<void> {
  const user = requireAuth();

  console.log('╭────────────────────────────────────╮');
  console.log('│          ALGOPULSE ACCOUNT         │');
  console.log('╰────────────────────────────────────╯');
  console.log(`Name       ${user.name}`);
  console.log(`Email      ${user.email}`);
  console.log('\nCONNECTED PROFILES');
  console.log('(No connected profiles yet)');
}
