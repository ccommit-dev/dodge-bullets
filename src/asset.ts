/** Resolves public assets for local Vite and the GitHub Pages demo subpath. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
