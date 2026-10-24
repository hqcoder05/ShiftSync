export function resolveCharacterGender(value) {
  const gender = String(typeof value === 'object' && value ? value.gender ?? value.staffGender ?? '' : value ?? '')
    .trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['female', 'nu', 'f'].includes(gender) ? 'FEMALE' : 'MALE';
}
