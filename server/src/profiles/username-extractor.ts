import { Platform } from '../config/constants.js';
import { ParsedUrl } from './url-parser.js';

export function extractUsername(platform: Platform, parsed: ParsedUrl): string | null {
  const pathname = parsed.pathname;
  
  switch (platform) {
    case Platform.CODEFORCES: {
      const match = pathname.match(/^\/profile\/([^\/]+)/);
      return match ? match[1]! : null;
    }
    
    case Platform.LEETCODE: {
      const match = pathname.match(/^\/u\/([^\/]+)/);
      return match ? match[1]! : null;
    }
    
    case Platform.CODECHEF: {
      const match = pathname.match(/^\/users\/([^\/]+)/);
      return match ? match[1]! : null;
    }
    
    default:
      return null;
  }
}
