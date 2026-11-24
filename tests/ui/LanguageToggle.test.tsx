// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HomeIntro } from '@/ui/HomeIntro';
import { LANG_STORAGE_KEY, resetLangForTests } from '@/ui/langStore';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'en';
  resetLangForTests();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('language toggle', () => {
  it('renders English by default with English pressed', () => {
    render(<HomeIntro />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('VayuTula');
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('switches text, <html lang> and storage to Hindi', async () => {
    render(<HomeIntro />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'हिन्दी' }));
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('वायुतुला');
    expect(document.documentElement.lang).toBe('hi');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('hi');
    expect(screen.getByRole('group', { name: 'भाषा' })).toBeTruthy();
  });

  it('restores the saved language on load', () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'hi');
    render(<HomeIntro />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('वायुतुला');
    expect(document.documentElement.lang).toBe('hi');
  });

  it('still switches when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<HomeIntro />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'हिन्दी' }));
    });
    expect(document.documentElement.lang).toBe('hi');
  });
});
