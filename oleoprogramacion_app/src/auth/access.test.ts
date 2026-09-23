import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPage, canAccessProductivity } from './access';

test('Aldo puede abrir sus secciones directivas autorizadas', () => {
  const aldo = { role: 'DIRECTIVO' as const, username: 'aldo' };
  for (const path of ['/', '/cycles', '/productivity', '/programming/all']) {
    assert.equal(canAccessPage(aldo, path), true);
  }
  for (const path of ['/absences', '/machinery', '/novedades']) {
    assert.equal(canAccessPage(aldo, path), false);
  }
  assert.equal(canAccessProductivity(aldo), true);
});

test('Las restricciones existentes de otros directivos permanecen', () => {
  const directivo = { role: 'DIRECTIVO' as const, username: 'lcruz' };
  assert.equal(canAccessPage(directivo, '/cycles'), true);
  assert.equal(canAccessProductivity(directivo), true);
  assert.equal(canAccessProductivity({ role: 'DIRECTIVO', username: 'jcarlos' }), false);
  const lgomez = { role: 'DIRECTIVO' as const, username: 'lgomez' };
  for (const path of ['/', '/programming/all', '/cycles', '/productivity', '/absences', '/machinery', '/novedades']) {
    assert.equal(canAccessPage(lgomez, path), true);
  }
  assert.equal(canAccessProductivity(lgomez), true);
});
