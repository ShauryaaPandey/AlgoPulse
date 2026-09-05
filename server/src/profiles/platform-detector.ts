import { Platform } from '../config/constants.js';
import { ParsedUrl } from './url-parser.js';

export function detectPlatform(parsed: ParsedUrl): Platform | null {
  const hostname = parsed.hostname.toLowerCase();
  
  if (hostname === 'codeforces.com' || hostname === 'www.codeforces.com') {
    return Platform.CODEFORCES;
  }
  
  if (hostname === 'leetcode.com' || hostname === 'www.leetcode.com') {
    return Platform.LEETCODE;
  }
  
  if (hostname === 'codechef.com' || hostname === 'www.codechef.com') {
    return Platform.CODECHEF;
  }
  
  return null;
}
