export const ADMIN_PERSONNEL_NAMES = [
  'PAOLA CHAVEZ',
  'LUIS CRUZ',
  'SEBASTIAN DIAZ',
  'SAMUEL BORJA',
  'JOSE PAHUANA',
  'ALVARO MANJARREZ',
  'GIOVANNY ANAYA',
  'MANUEL BLANCO',
  'LUIS BARRAZA',
  'JUAN BOHORQUEZ'
];

export const isReubicado = (person: any): boolean => {
  if (!person) return false;
  const tipo = (person.tipoPersonal || person.tipo_personal || person.type || '').toUpperCase();
  return tipo === 'REUBICADO' || tipo.includes('REUBICAD');
};

export const isAdmin = (person: any): boolean => {
  if (!person) return false;
  if (isReubicado(person)) return false;

  const tipo = (person.tipoPersonal || person.tipo_personal || person.type || '').toUpperCase();
  if (tipo === 'ADMINISTRATIVO' || tipo === 'ADMIN' || tipo === 'OFICINA') {
    return true;
  }
  if (tipo === 'CAMPO' || tipo === 'OPERATIVO' || tipo.includes('PRODUCTIVO')) {
    return false;
  }

  const name = (person.name || person.nombreCompleto || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cargo = (person.jobTitle || person.laborCargo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (ADMIN_PERSONNEL_NAMES.some(adm => name.includes(adm))) {
    return true;
  }

  const adminKeywords = [
    'analista', 'jefe', 'supervisor', 'secretari', 'gerente', 'coordinador',
    'director', 'practicante', 'administrador', 'oficina', 'auxiliar administrativo'
  ];
  return adminKeywords.some(kw => cargo.includes(kw));
};

export const isOperative = (person: any): boolean => {
  if (!person) return false;
  if (isReubicado(person)) return false;
  if (isAdmin(person)) return false;

  const tipo = (person.tipoPersonal || person.tipo_personal || person.type || '').toUpperCase();
  if (tipo === 'CAMPO' || tipo === 'OPERATIVO' || tipo.includes('PRODUCTIVO')) {
    return true;
  }

  return true;
};
