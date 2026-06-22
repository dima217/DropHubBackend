import {
  matchesAnyMimeTypeFilter,
  matchesMimeTypeFilter,
} from './mime-type-filter';

describe('matchesMimeTypeFilter', () => {
  it('matches exact full mime types', () => {
    expect(matchesMimeTypeFilter('image/jpeg', 'image/jpeg')).toBe(true);
    expect(matchesMimeTypeFilter('image/png', 'image/jpeg')).toBe(false);
  });

  it('matches top-level mime categories', () => {
    expect(matchesMimeTypeFilter('video/mp4', 'video')).toBe(true);
    expect(matchesMimeTypeFilter('audio/mpeg', 'audio')).toBe(true);
    expect(matchesMimeTypeFilter('application/pdf', 'application')).toBe(true);
    expect(matchesMimeTypeFilter('text/plain', 'text')).toBe(true);
    expect(matchesMimeTypeFilter('image/png', 'image')).toBe(true);
  });

  it('does not match unrelated types', () => {
    expect(matchesMimeTypeFilter('video/mp4', 'audio')).toBe(false);
    expect(matchesMimeTypeFilter('image/png', 'video')).toBe(false);
  });
});

describe('matchesAnyMimeTypeFilter', () => {
  it('returns true when no filters are provided', () => {
    expect(matchesAnyMimeTypeFilter('video/mp4', undefined)).toBe(true);
    expect(matchesAnyMimeTypeFilter('video/mp4', [])).toBe(true);
  });

  it('matches when any filter matches', () => {
    expect(
      matchesAnyMimeTypeFilter('video/mp4', ['audio', 'video']),
    ).toBe(true);
    expect(
      matchesAnyMimeTypeFilter('image/png', ['video', 'image']),
    ).toBe(true);
  });
});
