function required(name: string, fallback?: string): string {
  const v = process.env[name]?.trim();
  if (v) return v;
  if (fallback !== undefined) return fallback;
  return "";
}

export const env = {
  NEXT_PUBLIC_APP_URL: required("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
};
