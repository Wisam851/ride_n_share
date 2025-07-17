export function parseBearerToken(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
}
