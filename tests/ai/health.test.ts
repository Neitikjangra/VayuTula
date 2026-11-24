import { describe, expect, it } from 'vitest';
import { containsHealthAdvice, detectSymptoms } from '@/ai/health';

describe('containsHealthAdvice() (PRD 6, guardrail 3)', () => {
  it.each([
    'Give your son 2 puffs of his inhaler.',
    'Take a paracetamol tablet.',
    'The usual dose is 5 mg.',
    'This sounds like a diagnosis of bronchitis.',
    'Ask your doctor to prescribe something.',
    'बच्चे को दवा दें।',
    'इसकी खुराक दिन में दो बार है।',
  ])('flags medical advice: %s', (text) => {
    expect(containsHealthAdvice(text)).toBe(true);
  });

  it.each([
    'How many people live in your home?',
    'Which rooms do you have, and roughly how big are they?',
    'आपके घर में कितने लोग रहते हैं?',
    'Do you have an air purifier, and in which room?',
  ])('allows ordinary setup questions: %s', (text) => {
    expect(containsHealthAdvice(text)).toBe(false);
  });
});

describe('detectSymptoms()', () => {
  it.each([
    'My daughter has been coughing all night',
    'Dadi gets breathless in the evening',
    'I have chest pain when I walk outside',
    'मेरे बेटे को रात भर खांसी आती है',
    'दादी की सांस फूलती है',
    'aankhon mein jalan hoti hai and itchy eyes',
  ])('detects a symptom mention: %s', (text) => {
    expect(detectSymptoms(text)).toBe(true);
  });

  it.each([
    'We are four people in a 2BHK in Noida',
    'My son has asthma, so we keep the purifier on',
    'हम नोएडा में 2BHK में चार लोग रहते हैं',
  ])('does not flag plain descriptions: %s', (text) => {
    expect(detectSymptoms(text)).toBe(false);
  });
});
