export function matchesMimeTypeFilter(
  fileMimeType: string | null | undefined,
  filter: string,
): boolean {
  if (!fileMimeType || !filter) {
    return false;
  }

  const mime = fileMimeType.toLowerCase();
  const pattern = filter.toLowerCase();

  if (pattern.includes('/')) {
    return mime === pattern;
  }

  return mime === pattern || mime.startsWith(`${pattern}/`);
}

export function matchesAnyMimeTypeFilter(
  fileMimeType: string | null | undefined,
  filters: string[] | undefined,
): boolean {
  if (!filters?.length) {
    return true;
  }

  return filters.some((filter) => matchesMimeTypeFilter(fileMimeType, filter));
}
