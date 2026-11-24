/**
 * Health guardrails (PRD 6, guardrail 3). AI text must never diagnose or name medicines or
 * doses; a user's mention of symptoms shows a fixed "please consult a doctor" message instead.
 */

const MEDICAL_ADVICE: RegExp[] = [
  /\b(diagnos\w*|prescri\w*|medicin\w*|medicat\w*|dosage|doses?|tablets?|pills?|capsules?|syrups?)\b/i,
  /\b(inhalers?|nebuli[sz]\w*|puffs?|steroids?|antibiotics?|antihistamines?|paracetamol|salbutamol|montelukast|ibuprofen)\b/i,
  /\b\d+(\.\d+)?\s?(mg|ml|mcg)\b/i,
  /(दवा|दवाई|दवाइयाँ|खुराक|गोली|गोलियाँ|इनहेलर|नुस्खा|निदान|सिरप)/,
];

const SYMPTOMS: RegExp[] = [
  /\b(cough\w*|wheez\w*|breathless\w*|short(ness)? of breath|chest (pain|tightness)|headaches?)\b/i,
  /\b(sore throat|(itchy|burning|watery|red) eyes|eye irritation|dizz\w*|nause\w*)\b/i,
  /(खांसी|खाँसी|सांस फूल|साँस फूल|सांस लेने में|साँस लेने में|सीने में दर्द|सिरदर्द|सिर दर्द|गले में खराश|आँखों में जलन|आंखों में जलन|चक्कर)/,
  /\b(khansi|khaansi|saans phool\w*|aankhon mein jalan)\b/i,
];

/** True if the text gives medical advice: diagnosis, medicine, dose or treatment words. */
export function containsHealthAdvice(text: string): boolean {
  return MEDICAL_ADVICE.some((re) => re.test(text));
}

/** True if the user mentions a symptom; the UI then shows the fixed consult-a-doctor text. */
export function detectSymptoms(text: string): boolean {
  return SYMPTOMS.some((re) => re.test(text));
}
