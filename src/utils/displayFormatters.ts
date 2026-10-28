export const getBedIdentifier = (value?: string | null): string | null => {
  let identifier = value?.trim() ?? '';
  if (!identifier) return null;

  while (/^bed\s*[:#-]?\s*/i.test(identifier)) {
    identifier = identifier.replace(/^bed\s*[:#-]?\s*/i, '').trim();
  }

  return identifier || null;
};

export const formatBedLabel = (value?: string | null): string | null => {
  const identifier = getBedIdentifier(value);
  return identifier ? `Bed ${identifier}` : null;
};
