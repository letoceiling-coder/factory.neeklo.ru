import nodeFetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

let proxyAgent: SocksProxyAgent | null = null;

function getProxyAgent(): SocksProxyAgent | null {
  const url = process.env.EXTERNAL_PROXY_URL?.trim();
  if (!url) return null;
  if (!proxyAgent) proxyAgent = new SocksProxyAgent(url);
  return proxyAgent;
}

/** Provider slugs that should use EXTERNAL_PROXY_URL when set. */
function shouldUseProxy(slug: string): boolean {
  const raw = process.env.EXTERNAL_PROXY_SLUGS || 'elevenlabs,heygen,hedra,did';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(slug);
}

/**
 * Fetch for external provider APIs. Routes through NL SOCKS proxy (WireGuard)
 * when EXTERNAL_PROXY_URL is configured and slug is listed in EXTERNAL_PROXY_SLUGS.
 */
export async function externalFetch(
  slug: string,
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  if (shouldUseProxy(slug)) {
    const agent = getProxyAgent();
    if (agent) {
      const res = await nodeFetch(String(url), { ...init, agent } as any);
      return res as unknown as Response;
    }
  }
  return fetch(url, init);
}

export function isProxyConfigured(): boolean {
  return !!process.env.EXTERNAL_PROXY_URL?.trim();
}

export function proxySlugs(): string[] {
  const raw = process.env.EXTERNAL_PROXY_SLUGS || 'elevenlabs,heygen,hedra,did';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
