// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ProfileSchema } from '@/domain';
import { LANG_STORAGE_KEY, resetLangForTests } from '@/ui/langStore';
import SetupScreen from '@/ui/setup/SetupScreen';

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

/** Opens /setup and switches to the manual form. */
function renderForm() {
  render(<SetupScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'Use the form instead' }));
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save and see actions' }));
  });
}

describe('manual profile form', () => {
  it('starts with the chosen city and a valid default home', async () => {
    renderForm();
    expect(screen.getByText('Using Noida.')).toBeTruthy();
    await submit();
    expect(savedProfile()?.city).toBe('Noida');
    expect(push).toHaveBeenCalledWith('/');
  });

  it('saves a 2BHK with a purifier and a child', async () => {
    renderForm();
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
    renderForm();
    fireEvent.change(screen.getAllByLabelText('Floor area (m²)')[0]!, { target: { value: '1' } });
    await submit();
    expect(savedProfile()).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('still refuses and explains if the browser lets an invalid answer through', async () => {
    renderForm();
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
    renderForm();
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
    renderForm();
    const search = screen.getByRole('search');
    expect(search.parentElement?.closest('form')).toBeNull();
  });

  it('opens the form directly when a home is already saved', () => {
    window.localStorage.setItem(
      'vayutula.profile',
      JSON.stringify(
        ProfileSchema.parse({
          city: 'Noida',
          lat: 28.58,
          lon: 77.33,
          lang: 'en',
          members: [{ id: 'm1', label: 'Me', ageGroup: 'adult', sensitive: false }],
          rooms: [{ id: 'r1', name: 'Bedroom', kind: 'bedroom', areaM2: 12, occupancy: [] }],
          cooking: {
            fuel: 'lpg',
            mealsPerDay: 2,
            mealHours: [8, 20],
            chimney: false,
            kitchenDoor: false,
          },
          sources: { incensePerDay: 0, coilNightsPerWeek: 0, smokerIndoors: false },
          commute: { mode: 'none', kmPerDay: 0, daysPerWeek: 0 },
          budgetTier: 0,
        }),
      ),
    );
    render(<SetupScreen />);
    expect(
      screen.getByRole('button', { name: 'Describe your home in your own words' }),
    ).toBeTruthy();
    expect(screen.getAllByDisplayValue('Bedroom').length).toBeGreaterThan(0);
  });

  it('renders labels in Hindi', () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'hi');
    render(<SetupScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'इसके बजाय फ़ॉर्म इस्तेमाल करें' }));
    expect(screen.getByRole('button', { name: 'सहेजें और कदम देखें' })).toBeTruthy();
    expect(screen.getAllByLabelText('कमरे का नाम').length).toBe(3);
  });
});
