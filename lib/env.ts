function required(name: string, fallback?: string): string {
  const v = process.env[name]?.trim();
  if (v) return v;
  if (fallback !== undefined) return fallback;
  return "";
}

export const env = {
  NEXT_PUBLIC_APP_URL: required("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  OPEN_ROUTER_KEY: required("OPEN_ROUTER_KEY", ""),
  GITHUB_APP_ID: required("GITHUB_APP_ID", ""),
  GITHUB_APP_PRIVATE_KEY: required("GITHUB_APP_PRIVATE_KEY", ""),
  GITHUB_WEBHOOK_SECRET: required("GITHUB_WEBHOOK_SECRET", ""),
};
