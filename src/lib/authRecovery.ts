export function hasRecoveryParams({
  search = window.location.search,
  hash = window.location.hash,
}: {
  hash?: string;
  search?: string;
} = {}) {
  const query = new URLSearchParams(search);

  return (
    query.get("type") === "recovery" ||
    query.has("code") ||
    hash.includes("type=recovery") ||
    hash.includes("access_token=")
  );
}

export function isRecoveryRedirectInProgress({
  pathname = window.location.pathname,
  search = window.location.search,
  hash = window.location.hash,
}: {
  hash?: string;
  pathname?: string;
  search?: string;
} = {}) {
  return pathname === "/reset-password" || hasRecoveryParams({ search, hash });
}

export function getRecoveryRedirectPath({
  pathname = window.location.pathname,
  search = window.location.search,
  hash = window.location.hash,
}: {
  hash?: string;
  pathname?: string;
  search?: string;
} = {}) {
  if (!hasRecoveryParams({ search, hash }) || pathname === "/reset-password") {
    return null;
  }

  return `/reset-password${search}${hash}`;
}

export function getResetPasswordRedirectUrl(origin = window.location.origin) {
  return `${origin}/reset-password`;
}