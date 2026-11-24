// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ProfileSchema } from '@/domain';
import { resetLangForTests } from '@/ui/langStore';
import { ProfileForm } from '@/ui/setup/ProfileForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(
    'vayutula.place',
    JSON.stringify({ kind: 'search', name: 'Noida', lat: 28.58, lon: 77.33 }),
  );
  resetLangForTests();
  push.mockReset();
});

afterEach(() => cleanup());

function savedProfile() {
  const raw = window.localStorage.getItem('vayutula.profile');
  return raw === null ? null : ProfileSchema.parse(JSON.parse(raw));
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save and see actions' }));
  });
}

describe('manual profile form', () => {
  it('starts with the chosen city and a valid default home', async () => {
    render(<ProfileForm lang="en" />);
    expect(screen.getByText('Using Noida.')).toBeTruthy();
    await submit();
    expect(savedProfile()?.city).toBe('Noida');
    expect(push).toHaveBeenCalledWith('/');
  });

  it('saves a 2BHK with a purifier and a child', async () => {
    render(<ProfileForm lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add person' }));
    const people = screen.getAllByLabelText('Name or nickname');
    fireEvent.change(people[1]!, { target: { value: 'Kid' } });
    fireEvent.change(screen.getAllByLabelText('Age group')[1]!, { target: { value: 'child' } });
    fireEvent.change(screen.getAllByLabelText('Air purifier')[0]!, {
      target: { value: 'philips-ac1215' },
    });
    fireEvent.change(screen.getByLabelText('Budget for air improvements'), {
      target: { value: '2000' },
    });
    await submit();
    const profile = savedProfile();
    expect(profile?.members.map((m) => [m.label, m.ageGroup])).toEqual([
      ['Me', 'adult'],
      ['Kid', 'child'],
    ]);
    expect(profile?.rooms[0]?.purifierId).toBe('philips-ac1215');
    expect(profile?.budgetTier).toBe(2000);
  });

  it('does not save out-of-range answers: the browser blocks them first', async () => {
    render(<ProfileForm lang="en" />);
    fireEvent.change(screen.getAllByLabelText('Floor area (m²)')[0]!, { target: { value: '1' } });
    await submit();
    expect(savedProfile()).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('still refuses and explains if the browser lets an invalid answer through', async () => {
    render(<ProfileForm lang="en" />);
    fireEvent.change(screen.getAllByLabelText('Floor area (m²)')[0]!, { target: { value: '1' } });
    await act(async () => {
      fireEvent.submit(
        screen.getByRole('button', { name: 'Save and see actions' }).closest('form')!,
      );
    });
    expect(savedProfile()).toBeNull();
    expect(screen.getByRole('alert').textContent).toBe(
      'Some answers need checking. Please review the form.',
    );
  });

  it('lets you say who is in a room and when', async () => {
    render(<ProfileForm lang="en" />);
    const kitchen = screen
      .getAllByRole('listitem')
      .find((li) => within(li).queryAllByDisplayValue('Kitchen').length > 0)!;
    fireEvent.click(within(kitchen).getByRole('button', { name: 'Add a time' }));
    fireEvent.change(within(kitchen).getByLabelText('From'), { target: { value: '7' } });
    fireEvent.change(within(kitchen).getByLabelText('Until'), { target: { value: '9' } });
    await submit();
    expect(savedProfile()?.rooms[2]?.occupancy).toEqual([
      { memberId: 'm1', fromHour: 7, toHour: 9 },
    ]);
  });

  it('keeps the city search outside the profile form (no nested forms)', () => {
    render(<ProfileForm lang="en" />);
    const search = screen.getByRole('search');
    expect(search.parentElement?.closest('form')).toBeNull();
  });

  it('renders labels in Hindi', () => {
    render(<ProfileForm lang="hi" />);
    expect(screen.getByRole('button', { name: 'सहेजें और कदम देखें' })).toBeTruthy();
    expect(screen.getAllByLabelText('कमरे का नाम').length).toBe(3);
  });
});
