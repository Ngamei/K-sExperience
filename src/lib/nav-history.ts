/** In-app navigation memory (client only): the previous app path, so dialogs can "cancel" back to it. */
let current: string | null = null;
let previous: string | null = null;
export function recordPath(path: string) {
  if (path === current) return;
  previous = current;
  current = path;
}
export const previousPath = () => previous;
