/** Compara identificadores reales de una persona sin reinterpretar IDs históricos. */
export function matchPerson(person: any, target: unknown): boolean {
  if (!person || target === null || target === undefined) return false;
  const reference = String(target).trim().toLowerCase();
  if (!reference) return false;

  // Un ID como PER-1128144472 puede pertenecer a una persona cuya cédula
  // cambió, mientras otra persona tiene la cédula 1128144472. Quitar el
  // prefijo mezclaría ambas identidades y bloquearía a la segunda.
  return [person.id, person.documento, person.cedula, person.name, person.nombreCompleto]
    .some(value => value !== null && value !== undefined && String(value).trim().toLowerCase() === reference);
}
