import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCycleFile } from './spreadsheetImport';

test('importa ciclos sin recuento de personas', async () => {
  const file = new File([
    'Fecha,Ubicacion Tecnica,Labor,Recuento de personas\n',
    '2026-09-29,01F020,Cosecha,\n',
  ], 'ciclos.csv', { type: 'text/csv' });

  const result = await parseCycleFile(file);

  assert.deepEqual(result.errors, []);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].personnelCount, null);
});

test('rechaza un recuento negativo en ciclos', async () => {
  const file = new File([
    'Fecha,Ubicacion Tecnica,Labor,Recuento de personas\n',
    '2026-09-29,01F020,Cosecha,-1\n',
  ], 'ciclos.csv', { type: 'text/csv' });

  const result = await parseCycleFile(file);

  assert.equal(result.rows.length, 0);
  assert.match(result.errors[0], /no puede ser negativo/i);
});
