export type AgeGroup = '18–39' | '40–59' | '60–75' | '76+' | '<18';

export interface Patient {
  id: string; // e.g., "PAT-4029"
  nameOrInitials: string;
  age: number;
  ageGroup: AgeGroup;
  sex?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  wardOrRoom?: string;
  admissionNotes?: string;
  createdAt: string; // ISO date string
  lastScreeningAt?: string;
  screeningCount: number;
}

export function deriveAgeGroup(age: number): AgeGroup {
  if (age < 18) return '<18';
  if (age <= 39) return '18–39';
  if (age <= 59) return '40–59';
  if (age <= 75) return '60–75';
  return '76+';
}
