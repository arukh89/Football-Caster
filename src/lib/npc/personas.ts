export type Persona = 'direct' | 'balanced' | 'compact' | 'gegenpress' | 'pragmatic';

export function defaultPersona(intelligence: number): Persona {
  if (intelligence >= 85) return 'gegenpress';
  if (intelligence >= 75) return 'balanced';
  if (intelligence >= 65) return 'compact';
  return 'pragmatic';
}
