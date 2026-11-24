// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import health from '@/config/health-library.json';
import { InstallButton } from '@/ui/InstallButton';
import { SiteFooter } from '@/ui/SiteFooter';
import { StatusPage } from '@/ui/StatusPage';
import { resetLangForTests } from '@/ui/langStore';

afterEach(() => {
  cleanup();
  resetLangForTests();
});

const statement = (id: string) => health.statements.find((s) => s.id === id)!;

describe('footer', () => {
  it('shows the not-medical-advice and see-a-doctor statements word for word', () => {
    render(<SiteFooter lang="en" />);
    expect(screen.getByText(statement('not-medical-advice').en)).toBeTruthy();
    expect(screen.getByText(statement('consult-doctor').en)).toBeTruthy();
    expect(screen.getByText(/^Your home details stay on this device/)).toBeTruthy();
  });

  it('uses the Hindi statements in Hindi', () => {
    render(<SiteFooter lang="hi" />);
    expect(screen.getByText(statement('not-medical-advice').hi)).toBeTruthy();
  });
});

describe('install button', () => {
  it('stays hidden until the browser offers installing', () => {
    render(<InstallButton lang="en" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens the browser prompt and confirms once installed', async () => {
    render(<InstallButton lang="en" />);
    let prompted = false;
    const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => {
        prompted = true;
      },
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    act(() => {
      window.dispatchEvent(offer);
    });
    expect(offer.defaultPrevented).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install VayuTula as an app' }));
    });
    expect(prompted).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/^VayuTula is installed/);
  });
});

describe('status pages', () => {
  it('not found links back home', () => {
    render(<StatusPage heading="status.notFoundHeading" body="status.notFoundBody" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to home' }).getAttribute('href')).toBe('/');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('the error page offers "Try again"', () => {
    let retried = false;
    render(
      <StatusPage
        heading="status.errorHeading"
        body="status.errorBody"
        onRetry={() => {
          retried = true;
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retried).toBe(true);
  });
});
