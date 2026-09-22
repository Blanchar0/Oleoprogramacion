import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPerson } from './personIdentity';

test('un ID histórico no se confunde con la cédula de otra persona', () => {
  const manuel = { id: 'PER-1128144472', documento: '1067716018', name: 'MANUEL RIBON CAMARGO' };
  const holber = { id: '7e177574-7d87-44a8-96a4-b217b1fcdf52', documento: '1128144472', name: 'HOLBER RIBON MOLINA' };

  assert.equal(matchPerson(manuel, 'PER-1128144472'), true);
  assert.equal(matchPerson(holber, 'PER-1128144472'), false);
  assert.equal(matchPerson(holber, '1128144472'), true);
  assert.equal(matchPerson(manuel, '1128144472'), false);
});

test('los nombres y documentos existentes siguen coincidiendo sin distinguir mayúsculas', () => {
  const person = { id: 'PER-001', documento: '123', name: 'Ana Pérez' };
  assert.equal(matchPerson(person, ' ana pérez '), true);
  assert.equal(matchPerson(person, '123'), true);
  assert.equal(matchPerson(person, 'PER-001'), true);
});
