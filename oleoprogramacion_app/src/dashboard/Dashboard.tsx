import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository, matchPerson } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Input } from '@/src/components/ui';
import { 
  Users, Briefcase, CalendarX, Tractor, Activity, 
  Award, TrendingUp, AlertTriangle, UserX, Stethoscope, 
  CheckCircle2, Layers, Calendar, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

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

export const isOperative = (person: any): boolean => {
  if (!person) return false;

  // 1. Si el usuario definió la clasificación en Catálogos
  const tipo = (person.tipoPersonal || person.tipo_personal || person.type || '').toUpperCase();
  if (tipo === 'ADMINISTRATIVO' || tipo === 'ADMIN' || tipo === 'OFICINA') {
    return false;
  }
  if (tipo === 'CAMPO' || tipo === 'OPERATIVO') {
    return true;
  }

  // 2. Si no tiene clasificación explícita, comprobar por nombre y palabras clave de cargo
  const name = (person.name || person.nombreCompleto || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cargo = (person.jobTitle || person.laborCargo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (ADMIN_PERSONNEL_NAMES.some(adm => name.includes(adm))) {
    return false;
  }

  const adminKeywords = [
    'analista', 'jefe', 'supervisor', 'secretari', 'gerente', 'coordinador', 
    'director', 'practicante', 'administrador', 'oficina', 'auxiliar administrativo'
  ];
  return !adminKeywords.some(kw => cargo.includes(kw));
};

export default function Dashboard() {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [absencesRange, setAbsencesRange] = useState<'day' | 'month'>('month');

  const [programmings, setProgrammings] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);

  useEffect(() => {
    const filters: any = { date };
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsub1 = repository.subscribeProgramming(filters, setProgrammings);
    const unsub2 = repository.subscribeMachinery(filters, setMachineries);
    
    // Suscripción de inasistencias del mes para que el filtro mensual incluya todos los días
    const monthFilter: any = { month: date.substring(0, 7) };
    if (user?.role === 'SUPERVISOR') monthFilter.supervisorId = user.idSupervisor;
    const unsub3 = repository.subscribeAbsences(monthFilter, setAbsences);
    
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [date, user]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-forest-900 font-medium text-sm">Cargando tablero táctico...</p>
      </div>
    </div>
  );

  const filteredProgrammings = programmings.filter(p => p.status === 'CONFIRMADA');
  const filteredMachineries = machineries;
  const filteredAbsences = absences.filter(a => a.date === date);
  const isTerminationNovelty = (tipo?: string) => {
    if (!tipo) return false;
    const t = tipo.toUpperCase().trim();
    return t === 'RENUNCIA' || t === 'TERMINACION_CONTRATO' || t === 'DESPIDO' || t === 'RETIRO';
  };

  const isUnjustified = (reason?: string) => {
    if (!reason) return true;
    const r = reason.trim().toLowerCase();
    if (r.includes('incapacidad') || r.includes('vacacion') || r.includes('permiso') || r.includes('calamidad') || r.includes('licencia') || r.includes('suspensi')) {
      return false;
    }
    return true;
  };

  const NovedadesPanel = () => {
    const activeNovedades = (catalogs.personnelNovelties || []).filter((n: any) => {
      if (isTerminationNovelty(n.tipo)) {
        return n.fechaInicio === date;
      }
      return n.fechaInicio <= date && (n.fechaFin >= date || n.fechaFin === 'N/A');
    });

    if (activeNovedades.length === 0) return null;

    return (
      <Card className="border-amber-200/80 shadow-sm bg-gradient-to-r from-amber-50/50 via-amber-50/20 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between text-amber-900">
            <span className="flex items-center gap-2">
              <CalendarX size={18} className="text-amber-600" /> Novedades Activas del Día
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {activeNovedades.length} Novedad{activeNovedades.length > 1 ? 'es' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeNovedades.map((n: any) => {
              const isTerm = isTerminationNovelty(n.tipo);
              return (
                <div key={n.id} className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200/60 shadow-xs flex justify-between items-center hover:border-amber-400 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{n.personaNombreFuente}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                        isTerm ? 'bg-red-100 text-red-800 border border-red-200' :
                        n.tipo === 'INCAPACIDAD' ? 'bg-teal-100 text-teal-800' :
                        n.tipo === 'VACACIONES' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {n.tipo}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {isTerm ? `Fecha: ${n.fechaInicio} (Fin: N/A - Retiro)` : `${n.fechaInicio} al ${n.fechaFin}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const NormalDashboard = () => {
    const uniquePersonnel = new Set<string>();
    filteredProgrammings.forEach(p => (p.personnelIds || []).forEach((id: string) => uniquePersonnel.add(id)));
    filteredMachineries.filter(m => m.status !== 'CANCELADA').forEach(m => {
      if (m.operatorId) uniquePersonnel.add(m.operatorId);
    });
    
    const activeProgrammingsCount = filteredProgrammings.length;
    const machineryCount = filteredMachineries.filter(m => m.status !== 'CANCELADA').length;
    const absencesCount = filteredAbsences.filter(a => a.status === 'REGISTRADA').length;
    
    const activeOperatives = catalogs.personnel.filter((p:any) => p.active && isOperative(p));
    const totalActive = activeOperatives.length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-forest-100 text-forest-700 rounded-lg"><Users size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Personal Programado</p><h3 className="text-2xl font-bold text-forest-950">{uniquePersonnel.size} <span className="text-sm font-normal text-gray-500">/ {totalActive}</span></h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg"><CheckCircle2 size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Progs. Activas</p><h3 className="text-2xl font-bold text-forest-950">{activeProgrammingsCount}</h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><CalendarX size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Ausencias (Día)</p><h3 className="text-2xl font-bold text-forest-950">{absencesCount}</h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><Tractor size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Maquinaria Activa</p><h3 className="text-2xl font-bold text-forest-950">{machineryCount}</h3></div></CardContent></Card>
        </div>

        <NovedadesPanel />
      </div>
    );
  };

  const DirectivoDashboard = () => {
    const [unprogrammedSearch, setUnprogrammedSearch] = useState('');

    const unprogrammedPersonnel = useMemo(() => {
      const activeOperativesList = (catalogs.personnel || []).filter((p: any) => p.active !== false && isOperative(p));
      
      return activeOperativesList.filter((p: any) => {
        // 1. ¿Está en alguna programación (confirmada o pendiente) de la fecha?
        const inProg = programmings.some((prog: any) => 
          prog.date === date &&
          prog.status !== 'CANCELADA' && 
          Array.isArray(prog.personnelIds) && 
          prog.personnelIds.some((pId: any) => matchPerson(p, pId))
        );
        if (inProg) return false;

        // 2. ¿Está en maquinaria en la fecha?
        const inMach = machineries.some((m: any) => 
          m.date === date &&
          m.status !== 'CANCELADA' && 
          (
            matchPerson(p, m.operatorId) || 
            matchPerson(p, m.operatorName) || 
            matchPerson(p, m.operator_id) || 
            matchPerson(p, m.operator_name)
          )
        );
        if (inMach) return false;

        // 3. ¿Tiene inasistencia registrada en la fecha?
        const inAbs = filteredAbsences.some((a: any) => 
          a.status !== 'CANCELADA' && 
          (
            matchPerson(p, a.personnelId) || 
            matchPerson(p, a.personnelDoc) || 
            matchPerson(p, a.personnelName) ||
            matchPerson(p, a.personnel_id) || 
            matchPerson(p, a.personnel_doc) || 
            matchPerson(p, a.personnel_name)
          )
        );
        if (inAbs) return false;

        // 4. ¿Tiene novedad activa en la fecha?
        const inNov = (catalogs.personnelNovelties || []).some((n: any) => {
          const isMatch = matchPerson(p, n.personaDocumento) || matchPerson(p, n.personaId) || matchPerson(p, n.personaNombre);
          if (!isMatch) return false;
          if (isTerminationNovelty(n.tipo)) return n.fechaInicio === date;
          return n.fechaInicio <= date && (n.fechaFin >= date || n.fechaFin === 'N/A');
        });
        if (inNov) return false;

        return true;
      }).sort((a: any, b: any) => (a.name || a.nombreCompleto || '').localeCompare(b.name || b.nombreCompleto || '', 'es', { numeric: true }));
    }, [catalogs.personnel, catalogs.personnelNovelties, programmings, machineries, filteredAbsences, date]);

    const filteredUnprogrammed = useMemo(() => {
      if (!unprogrammedSearch.trim()) return unprogrammedPersonnel;
      const q = unprogrammedSearch.trim().toLowerCase();
      return unprogrammedPersonnel.filter((p: any) => {
        const name = (p.name || p.nombreCompleto || '').toLowerCase();
        const doc = (p.documento || '').toString().toLowerCase();
        const cargo = (p.jobTitle || p.laborCargo || '').toLowerCase();
        const cuadrilla = (p.cuadrilla || p.actividadCuadrilla || p.zona || '').toLowerCase();
        return name.includes(q) || doc.includes(q) || cargo.includes(q) || cuadrilla.includes(q);
      });
    }, [unprogrammedPersonnel, unprogrammedSearch]);

    const stats = useMemo(() => {
      // 1. Total Personas en Catálogo (activas y existentes)
      const totalPersonnelList = (catalogs.personnel || []).filter((p: any) => p.active !== false);
      const totalPeople = totalPersonnelList.length;

      // 2. Personal Administrativo y de Supervisión (oficina + supervisores)
      const adminList = totalPersonnelList.filter((p: any) => !isOperative(p));
      const adminTotal = adminList.length;

      // 3. Total Operativos Teóricos en nómina
      const activeOperativesList = totalPersonnelList.filter((p: any) => isOperative(p));
      const operativesPayrollTotal = activeOperativesList.length;

      // Novedades e inasistencias activas del día
      const activeNovedades = (catalogs.personnelNovelties || []).filter((n: any) => {
        if (isTerminationNovelty(n.tipo)) {
          return n.fechaInicio === date;
        }
        return n.fechaInicio <= date && (n.fechaFin >= date || n.fechaFin === 'N/A');
      });

      let inasistentesSet = new Set<string>();
      let permisosSet = new Set<string>();
      let vacacionesSet = new Set<string>();
      let incapacidadesSet = new Set<string>();

      activeNovedades.forEach((n:any) => {
        const doc = n.personaDocumento || n.personaId || n.personaNombreFuente;
        if (n.tipo === 'VACACIONES') vacacionesSet.add(doc);
        else if (n.tipo === 'INCAPACIDAD') incapacidadesSet.add(doc);
        else if (n.tipo === 'PERMISO' || n.tipo === 'Permiso autorizado' || n.tipo === 'CALAMIDAD') permisosSet.add(doc);
        else inasistentesSet.add(doc);
      });

      filteredAbsences.forEach((a:any) => {
        if (a.status === 'REGISTRADA') {
          const p = catalogs.personnel.find((per:any) => per.id === a.personnelId);
          const doc = p ? (p.documento || p.id) : a.personnelId;
          
          if (a.reason === 'Vacaciones') vacacionesSet.add(doc);
          else if (a.reason === 'Incapacidad') incapacidadesSet.add(doc);
          else if (a.reason === 'Permiso autorizado' || a.reason === 'PERMISO' || a.reason === 'Calamidad doméstica') permisosSet.add(doc);
          else inasistentesSet.add(doc);
        }
      });

      // Evitar doble conteo entre grupos
      incapacidadesSet.forEach(id => vacacionesSet.has(id) && incapacidadesSet.delete(id));
      permisosSet.forEach(id => (vacacionesSet.has(id) || incapacidadesSet.has(id)) && permisosSet.delete(id));
      inasistentesSet.forEach(id => (vacacionesSet.has(id) || incapacidadesSet.has(id) || permisosSet.has(id)) && inasistentesSet.delete(id));

      const totalUnavailable = vacacionesSet.size + incapacidadesSet.size + permisosSet.size + inasistentesSet.size;
      
      // Operativos de campo reales y disponibles en el día (presentes y sin reporte de inasistencia/novedad)
      const availableOperativesCount = Math.max(0, operativesPayrollTotal - totalUnavailable);

      let programmedOperativesSet = new Set<string>();
      const laborPersonnelCountMap = new Map<string, Set<string>>();

      // 1. Personal en programaciones confirmadas
      filteredProgrammings.forEach(p => {
        const laborObj = catalogs.labors.find((l:any) => l.id === p.laborId);
        const laborName = laborObj ? laborObj.name : 'Otra Labor';
        if (!laborPersonnelCountMap.has(laborName)) laborPersonnelCountMap.set(laborName, new Set());

        (p.personnelIds || []).forEach((id: string) => {
          const per = activeOperativesList.find((x: any) => x.id === id);
          if (per) {
            programmedOperativesSet.add(per.documento || per.id);
            laborPersonnelCountMap.get(laborName)?.add(per.documento || per.id);
          } else {
            programmedOperativesSet.add(id);
            laborPersonnelCountMap.get(laborName)?.add(id);
          }
        });
      });

      // 2. Operadores / Tractoristas en maquinaria del día
      filteredMachineries.filter(m => m.status !== 'CANCELADA').forEach(m => {
        if (!m.operatorId) return;
        const per = activeOperativesList.find((x: any) => x.id === m.operatorId || x.documento === m.operatorId || x.name === m.operatorName);
        const doc = per ? (per.documento || per.id) : m.operatorId;
        programmedOperativesSet.add(doc);

        const laborObj = catalogs.labors.find((l:any) => l.id === (m.laborId || m.labor_id));
        const laborName = laborObj ? laborObj.name : 'Maquinaria';
        if (!laborPersonnelCountMap.has(laborName)) laborPersonnelCountMap.set(laborName, new Set());
        laborPersonnelCountMap.get(laborName)?.add(doc);
      });

      const programmedCount = programmedOperativesSet.size;
      // La tasa de utilización se calcula sobre los operativos que en el día se encuentran disponibles y llegaron a la empresa
      const utilRate = availableOperativesCount > 0 ? (programmedCount / availableOperativesCount) * 100 : 0;

      // 1. Chart: Personas por Labor
      const palette = ['#123C2E', '#315D43', '#7FA33D', '#B9CF58', '#E6B94F', '#0284C7', '#6366F1', '#A855F7', '#EC4899'];
      const chartLabor = Array.from(laborPersonnelCountMap.entries())
        .map(([name, set], idx) => ({
          name,
          value: set.size,
          fill: palette[idx % palette.length]
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      // 2. Chart: Despliegue por Supervisor
      const bySupMap = new Map<string, Set<string>>();
      filteredProgrammings.forEach(p => {
        const sup = catalogs.supervisors.find((s:any) => s.id === p.idSupervisor);
        const supName = sup ? sup.name : (p.idSupervisor || 'Otros');
        if (!bySupMap.has(supName)) bySupMap.set(supName, new Set());
        (p.personnelIds || []).forEach((id: string) => {
          const per = activeOperativesList.find((x: any) => x.id === id);
          bySupMap.get(supName)?.add(per ? (per.documento || per.id) : id);
        });
      });

      filteredMachineries.filter(m => m.status !== 'CANCELADA').forEach(m => {
        if (!m.operatorId) return;
        const supId = m.supervisorId || m.idSupervisor;
        const sup = catalogs.supervisors.find((s:any) => s.id === supId);
        const supName = sup ? sup.name : (supId || 'Otros');
        if (!bySupMap.has(supName)) bySupMap.set(supName, new Set());
        const per = activeOperativesList.find((x: any) => x.id === m.operatorId);
        bySupMap.get(supName)?.add(per ? (per.documento || per.id) : m.operatorId);
      });

      const chartBySup = Array.from(bySupMap.entries())
        .map(([name, set]) => {
          return { name: name.split(' ')[0] + ' ' + (name.split(' ')[1] || ''), personas: set.size };
        })
        .sort((a, b) => b.personas - a.personas)
        .slice(0, 8);

      // 3. Chart: Motivos de Ausentismo / Inasistencias
      const chartAbsences = [
        { name: 'Inasistencia', value: inasistentesSet.size, fill: '#B42318' },
        { name: 'Incapacidad', value: incapacidadesSet.size, fill: '#123C2E' },
        { name: 'Permiso', value: permisosSet.size, fill: '#E6B94F' },
        { name: 'Vacaciones', value: vacacionesSet.size, fill: '#64748B' },
      ].filter(x => x.value > 0);

      // 4. Maquinaria Summary
      const activeMachineryCount = filteredMachineries.filter(m => m.status !== 'CANCELADA').length;
      const totalEquipmentCount = (catalogs.equipment || []).filter((e: any) => e.active).length;

      const machineryTypeMap = new Map<string, number>();
      filteredMachineries.forEach(m => {
        if (m.status !== 'CANCELADA') {
          const eq = catalogs.equipment.find((e: any) => e.id === m.equipmentId);
          const typeName = eq ? (eq.name || eq.type || 'Otro') : 'Equipo';
          machineryTypeMap.set(typeName, (machineryTypeMap.get(typeName) || 0) + 1);
        }
      });

      const chartMachinery = Array.from(machineryTypeMap.entries()).map(([name, value]) => ({
        name,
        value,
        fill: '#315D43'
      }));

      // 5. Top Leaderboard de Inasistentes Injustificados y Recurrencia
      const selectedMonthPrefix = date.substring(0, 7); // YYYY-MM
      const absenceRecurrenceMap = new Map<string, { 
        count: number; 
        name: string; 
        doc: string; 
        dates: string[];
      }>();
      
      const sourceAbsences = absencesRange === 'day' 
        ? absences.filter(a => a.date === date) 
        : absences.filter(a => a.date.startsWith(selectedMonthPrefix));

      sourceAbsences.forEach(a => {
        if (a.status === 'REGISTRADA' && isUnjustified(a.reason)) {
          const p = catalogs.personnel.find((per: any) => per.id === a.personnelId || per.documento === a.personnelDoc);
          const name = p ? (p.name || p.nombreCompleto) : (a.personnelName || 'Personal');
          const doc = p ? (p.documento || '') : (a.personnelDoc || '');
          const key = p ? p.id : (a.personnelId || a.personnelDoc || name);

          const current = absenceRecurrenceMap.get(key) || { count: 0, name, doc, dates: [] };
          current.count += 1;
          if (a.date && !current.dates.includes(a.date)) {
            current.dates.push(a.date);
          }
          absenceRecurrenceMap.set(key, current);
        }
      });

      const topAbsentees = Array.from(absenceRecurrenceMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalPeople,
        operativesTotal: availableOperativesCount,
        operativesPayrollTotal,
        adminTotal,
        absencesTotal: inasistentesSet.size,
        incapacidadesTotal: incapacidadesSet.size,
        permissionsTotal: permisosSet.size,
        vacationsTotal: vacacionesSet.size,
        availableOperativesCount,
        totalUnavailable,
        programmedCount,
        utilRate: Number(utilRate.toFixed(1)),
        chartLabor,
        chartAbsences,
        chartMachinery,
        chartBySup,
        activeMachineryCount,
        totalEquipmentCount,
        topAbsentees
      };
    }, [catalogs, date, absencesRange, filteredProgrammings, filteredMachineries, filteredAbsences]);

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header with Title and Date Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-forest-900 to-forest-950 p-5 rounded-2xl text-white shadow-lg border border-forest-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-lime-400 text-forest-950 rounded-md text-xs font-extrabold uppercase tracking-wider">
                Panel Directivo & Táctico
              </span>
              <span className="text-xs text-forest-200">Oleoflores Agronómica</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tablero de Operaciones
            </h2>
            <p className="text-xs sm:text-sm text-forest-200 mt-0.5">
              Control táctico de personal, rendimientos, maquinaria y ausentismo en campo
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 self-start sm:self-auto">
            <Calendar size={18} className="text-lime-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-forest-200 tracking-wider">Fecha de Análisis</span>
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="bg-transparent border-0 h-8 text-sm font-semibold text-white focus-visible:ring-0 p-0" 
              />
            </div>
          </div>
        </div>

        {/* Tactical Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Card 1: Total Personas */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-forest-50/40">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Total Personas</span>
                <div className="p-1.5 bg-forest-100 text-forest-900 rounded-lg">
                  <Users size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-forest-950">{stats.totalPeople}</h3>
            </CardContent>
          </Card>

          {/* Card 2: Operativos de Campo */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/30">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Operativos Campo</span>
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Layers size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-emerald-950">{stats.availableOperativesCount}</h3>
              <p className="text-[10px] text-emerald-700/80 mt-1 truncate">
                {stats.totalUnavailable > 0 ? `${stats.availableOperativesCount} de ${stats.operativesPayrollTotal} disponibles` : 'Personal productivo'}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Personal Administrativo */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-blue-50/30">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Oficina / Admin</span>
                <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                  <Briefcase size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-blue-950">{stats.adminTotal}</h3>
              <p className="text-[10px] text-blue-700/80 mt-1 truncate">Jefes, oficina y sups.</p>
            </CardContent>
          </Card>

          {/* Card 4: Inasistencias del Día */}
          <Card className="border-red-200 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-red-50/40">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Inasistencias</span>
                <div className="p-1.5 bg-red-100 text-red-800 rounded-lg">
                  <UserX size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-red-950">{stats.absencesTotal}</h3>
              <p className="text-[10px] text-red-700/80 mt-1 truncate">Sin justificar en el día</p>
            </CardContent>
          </Card>

          {/* Card 5: Incapacidades */}
          <Card className="border-teal-200 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-teal-50/40">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Incapacidades</span>
                <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                  <Stethoscope size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-teal-950">{stats.incapacidadesTotal}</h3>
              <p className="text-[10px] text-teal-700/80 mt-1 truncate">Médica activa</p>
            </CardContent>
          </Card>

          {/* Card 6: Permisos / Vacaciones */}
          <Card className="border-amber-200 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-amber-50/40">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Permisos / Vac.</span>
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <CalendarX size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-amber-900">{stats.permissionsTotal + stats.vacationsTotal}</h3>
              <p className="text-[10px] text-amber-700/80 mt-1 truncate">Novedad autorizada</p>
            </CardContent>
          </Card>

          {/* Card 7: Utilización Operativa % */}
          <Card className="border-lime-300 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-lime-50/50 to-white">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-lime-900 uppercase tracking-wider">Utilización</span>
                <div className="p-1.5 bg-lime-200 text-lime-800 rounded-lg">
                  <TrendingUp size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-lime-900">{stats.utilRate}%</h3>
              <p className="text-[10px] text-lime-800/80 mt-1 truncate">{stats.programmedCount} de {stats.availableOperativesCount} disp.</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Novelties Banner */}
        <NovedadesPanel />

        {/* Charts Row 1: Personas por Labor & Resumen de Ausentismo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Personas por Labor (Donut/Pie Chart) */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <Layers size={18} className="text-forest-700" /> Distribución de Personas por Labor
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Operarios asignados a tareas agrónomas en el día</p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {stats.chartLabor.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
                  No hay programaciones registradas para esta fecha.
                </div>
              ) : (
                <div className="h-[260px] flex flex-col md:flex-row items-center justify-between">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={stats.chartLabor} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55} 
                        outerRadius={85} 
                        paddingAngle={3}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.chartLabor.map((entry, index) => (
                          <Cell key={`cell-labor-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any, name: any) => [`${val} Operario(s)`, name]}
                        contentStyle={{ backgroundColor: '#123C2E', color: '#fff', borderRadius: '8px', border: 'none' }}
                        itemStyle={{ color: '#B9CF58' }}
                      />
                      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Resumen y Motivos de Ausentismo */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <CalendarX size={18} className="text-red-600" /> Resumen y Motivos de Novedad / Ausentismo
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Clasificación de inasistencias e incapacidades</p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {stats.chartAbsences.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
                  No hay inasistencias ni novedades reportadas en esta fecha.
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={stats.chartAbsences} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80} 
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {stats.chartAbsences.map((entry, index) => (
                          <Cell key={`cell-abs-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any, name: any) => [`${val} Persona(s)`, name]}
                        contentStyle={{ backgroundColor: '#123C2E', color: '#fff', borderRadius: '8px', border: 'none' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Resumen de Maquinaria & Despliegue por Supervisor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Resumen de Maquinaria y Equipos */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <Tractor size={18} className="text-blue-600" /> Resumen de Maquinaria y Equipos
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Equipos asignados y activos en el día</p>
              </div>
              <div className="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                {stats.activeMachineryCount} Equipos Activos
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {stats.chartMachinery.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                  No hay maquinaria activa programada hoy.
                </div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartMachinery} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#123C2E', color: '#fff', borderRadius: '8px', border: 'none' }}
                        formatter={(val: any) => [`${val} Unidad(es)`, 'Cantidad']}
                      />
                      <Bar dataKey="value" fill="#315D43" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 4: Personal Programado por Supervisor */}
          <Card className="border-forest-900/10 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                <Users size={18} className="text-lime-600" /> Despliegue de Personal por Supervisor
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Operarios asignados por cada supervisor de zona</p>
            </CardHeader>
            <CardContent className="pt-2">
              {stats.chartBySup.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                  No hay supervisores con personal programado hoy.
                </div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartBySup} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#123C2E', color: '#fff', borderRadius: '8px', border: 'none' }}
                        formatter={(val: any) => [`${val} Operario(s)`, 'Programados']}
                      />
                      <Bar dataKey="personas" fill="#7FA33D" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Leaderboard / Top de Inasistencias Injustificadas */}
        <Card className="border-forest-900/10 shadow-xs">
          <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                <Award size={18} className="text-amber-500" /> Leaderboard: Top Inasistencias Injustificadas
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Personal con ausencias sin justificación (acumulado {absencesRange === 'month' ? 'del mes actual' : 'del día'})</p>
            </div>
            <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-bold uppercase tracking-wider">
              <button 
                type="button"
                onClick={() => setAbsencesRange('month')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${absencesRange === 'month' ? 'bg-primary text-white shadow-xs font-bold' : 'text-gray-600 hover:text-primary hover:bg-gray-100'}`}
              >
                Mes Actual
              </button>
              <button 
                type="button"
                onClick={() => setAbsencesRange('day')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${absencesRange === 'day' ? 'bg-primary text-white shadow-xs font-bold' : 'text-gray-600 hover:text-primary hover:bg-gray-100'}`}
              >
                Día Seleccionado
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.topAbsentees.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 font-medium">
                No se registraron inasistencias injustificadas en este período ({absencesRange === 'month' ? 'Mes Actual' : date}).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stats.topAbsentees.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-red-50/40 via-white to-white rounded-xl border border-red-200/70 shadow-2xs hover:border-red-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                          idx === 1 ? 'bg-slate-300 text-slate-900' :
                          idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                          {item.count} {item.count === 1 ? 'Inasistencia' : 'Inasistencias'}
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-sm text-gray-900 leading-snug break-words" title={item.name}>
                        {item.name}
                      </h4>
                      {item.doc && (
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">C.C. {item.doc}</p>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2.5 border-t border-red-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-red-950">Faltas sin justificar:</span>
                        <span className="font-black text-red-700 text-sm">{item.count} {item.count === 1 ? 'vez' : 'veces'}</span>
                      </div>
                      {item.dates.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.dates.slice(0, 4).map(d => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold">
                              {d.split('-').slice(1).reverse().join('/')}
                            </span>
                          ))}
                          {item.dates.length > 4 && (
                            <span className="text-[10px] text-gray-500 font-bold self-center">
                              +{item.dates.length - 4} más
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Exclusiva ADMIN: Personal Pendiente por Programar */}
        {user?.role === 'ADMIN' && (
          <Card className="border-forest-900/15 shadow-sm bg-gradient-to-b from-white to-gray-50/50">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <UserX size={18} />
                  </div>
                  Personal Pendiente por Programar
                  <span className="ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    {unprogrammedPersonnel.length} Sin Programar
                  </span>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Operarios de campo disponibles en nómina que no han sido asignados a labores, maquinaria ni tienen inasistencia el día ({date}).
                </p>
              </div>

              {/* Buscador en vivo */}
              <div className="w-full sm:w-72">
                <Input 
                  placeholder="Buscar por nombre, cédula o cargo..." 
                  value={unprogrammedSearch}
                  onChange={(e) => setUnprogrammedSearch(e.target.value)}
                  className="bg-white text-xs h-9 border-gray-300"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {unprogrammedPersonnel.length === 0 ? (
                <div className="py-8 text-center text-emerald-800 bg-emerald-50/60 rounded-xl border border-emerald-200 p-6 flex flex-col items-center justify-center">
                  <CheckCircle2 size={36} className="text-emerald-600 mb-2" />
                  <p className="text-sm font-bold uppercase tracking-wide">¡Todo el personal operativo está cubierto!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Todos los operarios activos se encuentran programados en labores, maquinaria o tienen novedad/inasistencia registrada para el {date}.
                  </p>
                </div>
              ) : filteredUnprogrammed.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  No se encontraron coincidencias para "{unprogrammedSearch}".
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
                    <span>Mostrando <strong>{filteredUnprogrammed.length}</strong> de <strong>{unprogrammedPersonnel.length}</strong> personas</span>
                    <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      💡 Consulta con los supervisores de zona para su asignación
                    </span>
                  </div>

                  {/* Tabla / Lista scrolleable con altura fija */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[380px] overflow-y-auto shadow-2xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold tracking-wider sticky top-0 border-b border-gray-200 z-10">
                        <tr>
                          <th className="px-4 py-2.5">Operario</th>
                          <th className="px-4 py-2.5">Cédula</th>
                          <th className="px-4 py-2.5">Cargo / Labor Habitual</th>
                          <th className="px-4 py-2.5">Cuadrilla / Zona</th>
                          <th className="px-4 py-2.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredUnprogrammed.map((per: any) => (
                          <tr key={per.id || per.documento} className="hover:bg-amber-50/40 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-gray-900 uppercase">
                              {per.name || per.nombreCompleto}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 font-mono font-medium">
                              {per.documento}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">
                              {per.jobTitle || per.laborCargo || 'Operario de Campo'}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {per.cuadrilla || per.actividadCuadrilla || per.zona || 'Sin asignar'}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                Sin Asignar
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return <DirectivoDashboard />;
}
