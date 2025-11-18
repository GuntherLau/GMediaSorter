import { describe, expect, it } from 'vitest';
import { matchAspectRatioFilter, matchAllFilters } from '../filters';
import type { FilterState, VideoFile } from '../../types';

const createVideoFile = (overrides: Partial<VideoFile> = {}): VideoFile => ({
  name: 'sample.mp4',
  path: '/videos/sample.mp4',
  size: 1024,
  modified: new Date('2024-01-01T00:00:00Z').toISOString(),
  extension: 'mp4',
  width: 1920,
  height: 1080,
  duration: 120,
  aspectRatio: '16:9',
  resolutionLabel: '1080p',
  effectiveVerticalResolution: 1080,
  ...overrides,
});

describe('matchAspectRatioFilter', () => {
  it('matches portrait ratios below 0.9', () => {
    expect(matchAspectRatioFilter(0.56, 'portrait')).toBe(true);
    expect(matchAspectRatioFilter(1.2, 'portrait')).toBe(false);
  });

  it('matches square ratios around 1.0', () => {
    expect(matchAspectRatioFilter(1, 'square')).toBe(true);
    expect(matchAspectRatioFilter(0.88, 'square')).toBe(false);
  });

  it('matches standard landscape ratios between 1.1 and 1.9', () => {
    expect(matchAspectRatioFilter(1.78, 'standard')).toBe(true);
    expect(matchAspectRatioFilter(2.0, 'standard')).toBe(false);
  });

  it('matches ultrawide ratios above 1.9', () => {
    expect(matchAspectRatioFilter(2.4, 'ultrawide')).toBe(true);
    expect(matchAspectRatioFilter(1.5, 'ultrawide')).toBe(false);
  });

  it('supports unknown-only quick filter', () => {
    expect(matchAspectRatioFilter(null, 'unknown')).toBe(true);
    expect(matchAspectRatioFilter(1.33, 'unknown')).toBe(false);
  });

  it('keeps unknown ratios when filter is not all', () => {
    expect(matchAspectRatioFilter(null, 'portrait')).toBe(true);
  });
});

describe('matchAllFilters with aspect ratio', () => {
  const baseFilters: FilterState = {
    resolution: 'all',
    duration: 'all',
    aspectRatio: 'all',
  };

  it('allows files that match the selected aspect ratio', () => {
    const file = createVideoFile({ width: 3840, height: 1600, aspectRatio: '12:5' });
    const filters: FilterState = { ...baseFilters, aspectRatio: 'ultrawide' };
    expect(matchAllFilters(file, filters)).toBe(true);
  });

  it('excludes files outside the selected aspect ratio range', () => {
    const file = createVideoFile({ width: 1920, height: 1080 });
    const filters: FilterState = { ...baseFilters, aspectRatio: 'portrait' };
    expect(matchAllFilters(file, filters)).toBe(false);
  });

  it('filters down to files with unknown ratio when requested', () => {
    const fileWithUnknown = createVideoFile({ width: null, height: null, aspectRatio: null });
    const fileWithRatio = createVideoFile({ width: 1920, height: 1080 });

    const filters: FilterState = { ...baseFilters, aspectRatio: 'unknown' };
    expect(matchAllFilters(fileWithUnknown, filters)).toBe(true);
    expect(matchAllFilters(fileWithRatio, filters)).toBe(false);
  });
});
