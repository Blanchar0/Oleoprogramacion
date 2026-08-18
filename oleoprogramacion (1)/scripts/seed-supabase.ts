import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://giwlnwbcfudnlkagzpxb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_y5iIfWQCeJDmLnLEJsb-_g_0kxDWHOo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedData() {
  console.log('--- Probando inserción en Supabase ---');
  const exportData = JSON.parse(fs.readFileSync('firestore-export.json', 'utf8'));

  // Test insert user
  const testUser = {
    id: 'USR-73ACD9A5',
    username: 'admin',
    username_key: 'admin',
    name: 'Administrador Agronomía',
    role: 'ADMIN',
    pin: '0910',
    active: true
  };

  const { data, error } = await supabase.from('users').upsert(testUser);
  if (error) {
    console.error('Error insertando usuario de prueba:', error);
  } else {
    console.log('✅ Inserción exitosa en tabla users de Supabase');
  }
}

seedData().catch(console.error);
