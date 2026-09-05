export interface ParsedUrl {
  protocol: string;
  hostname: string;
  pathname: string;
  full: string;
}

export function parseUrl(urlString: string): ParsedUrl | null {
  try {
    const normalized = urlString.trim();
    let url: URL;
    
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      url = new URL(normalized);
    } else {
      url = new URL(`https://${normalized}`);
    }
    
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
      full: url.href,
    };
  } catch {
    return null;
  }
}
