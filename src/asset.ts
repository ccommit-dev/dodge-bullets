import { pixelPath } from "./ui/artStyle";

/** Resolves public assets for local Vite and the GitHub Pages demo subpath. 도트 그림체면 도트 그림이 있는 경로를 바꾼다(ui/artStyle) */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${pixelPath(path.replace(/^\/+/, ""))}`;
}
