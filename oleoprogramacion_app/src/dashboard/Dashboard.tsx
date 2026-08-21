import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
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

export const isOperative = (person: any): boolean => {
  if (!person) return false;
  const cargo = (person.jobTitle || person.laborCargo || '').toLowerCase();
  
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
    const unsub3 = repository.subscribeAbsences(filters, setAbsences);
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

  const filteredProgrammings = programmings.filter(p => p.status !== 'RECHAZADA');
  const filteredMachineries = machineries;
  const filteredAbsences = absences;

  const NovedadesPanel = () => {
    const activeNovedades = (catalogs.personnelNovelties || []).filter((n:any) => n.fechaInicio <= date && n.fechaFin >= date);
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
            {activeNovedades.map((n:any) => (
              <div key={n.id} className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200/60 shadow-xs flex justify-between items-center hover:border-amber-400 transition-colors">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{n.personaNombreFuente}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                      n.tipo === 'INCAPACIDAD' ? 'bg-teal-100 text-teal-800' :
                      n.tipo === 'VACACIONES' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {n.tipo}
                    </span>
                    <span className="text-xs text-gray-500">{n.fechaInicio} al {n.fechaFin}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const NormalDashboard = () => {
    const uniquePersonnel = new Set<string>();
    filteredProgrammings.forEach(p => (p.personnelIds || []).forEach((id: string) => uniquePersonnel.add(id)));
    
    const activeProgrammingsCount = filteredProgrammings.length;
    const machineryCount = filteredMachineries.filter(m => m.status !== 'CANCELADA').length;
    const absencesCount = filteredAbsences.filter(a => a.status === 'REGISTRADA').length;
    
    const activeOperatives = catalogs.personnel.filter((p:any) => p.active && isOperative(p));
    const totalActive = activeOperatives.length;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-forest-950">Panel de Control Operativo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-lime-100 text-lime-700 rounded-lg"><Users size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Personal Programado</p><h3 className="text-2xl font-bold text-forest-950">{uniquePersonnel.size} <span className="text-sm font-normal text-gray-500">/ {totalActive - absencesCount}</span></h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-green-100 text-green-700 rounded-lg"><CheckCircle2 size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Progs. Activas</p><h3 className="text-2xl font-bold text-forest-950">{activeProgrammingsCount}</h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><CalendarX size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Ausencias (Día)</p><h3 className="text-2xl font-bold text-forest-950">{absencesCount}</h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><Tractor size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Maquinaria Activa</p><h3 className="text-2xl font-bold text-forest-950">{machineryCount}</h3></div></CardContent></Card>
        </div>

        <NovedadesPanel />
      </div>
    );
  };

  const DirectivoDashboard = () => {
    const stats = useMemo(() => {
      const activeOperativesList = (catalogs.personnel || []).filter((p:any) => p.active && isOperative(p));
      const activeAdminList = (catalogs.personnel || []).filter((p:any) => p.active && !isOperative(p));
      
      const supervisorCount = (catalogs.supervisors || []).filter((s:any) => s.active !== false).length;
      const totalAdmin = Math.max(activeAdminList.length, supervisorCount > 0 ? supervisorCount + activeAdminList.length : activeAdminList.length);

      const activeNovedades = (catalogs.personnelNovelties || []).filter((n:any) => n.fechaInicio <= date && n.fechaFin >= date);

      let inasistentesSet = new Set<string>();
      let permisosSet = new Set<string>();
      let vacacionesSet = new Set<string>();
      let incapacidadesSet = new Set<string>();

      activeNovedades.forEach((n:any) => {
        if (n.tipo === 'VACACIONES') vacacionesSet.add(n.personaDocumento);
        else if (n.tipo === 'INCAPACIDAD') incapacidadesSet.add(n.personaDocumento);
        else if (n.tipo === 'PERMISO' || n.tipo === 'Permiso autorizado') permisosSet.add(n.personaDocumento);
        else inasistentesSet.add(n.personaDocumento);
      });

      filteredAbsences.forEach((a:any) => {
        if (a.status === 'REGISTRADA') {
          const p = catalogs.personnel.find((per:any) => per.id === a.personnelId);
          const doc = p ? p.documento : a.personnelId;
          
          if (a.reason === 'Vacaciones') vacacionesSet.add(doc);
          else if (a.reason === 'Incapacidad') incapacidadesSet.add(doc);
          else if (a.reason === 'Permiso autorizado' || a.reason === 'PERMISO') permisosSet.add(doc);
          else inasistentesSet.add(doc);
        }
      });

      incapacidadesSet.forEach(id => vacacionesSet.has(id) && incapacidadesSet.delete(id));
      permisosSet.forEach(id => (vacacionesSet.has(id) || incapacidadesSet.has(id)) && permisosSet.delete(id));
      inasistentesSet.forEach(id => (vacacionesSet.has(id) || incapacidadesSet.has(id) || permisosSet.has(id)) && inasistentesSet.delete(id));

      const totalUnavailable = vacacionesSet.size + incapacidadesSet.size + permisosSet.size + inasistentesSet.size;
      const availableOperativesCount = Math.max(0, activeOperativesList.length - totalUnavailable);

      let programmedOperativesSet = new Set<string>();
      const laborPersonnelCountMap = new Map<string, Set<string>>();

      filteredProgrammings.forEach(p => {
        const laborObj = catalogs.labors.find((l:any) => l.id === p.laborId);
        const laborName = laborObj ? laborObj.name : 'Otra Labor';
        if (!laborPersonnelCountMap.has(laborName)) laborPersonnelCountMap.set(laborName, new Set());

        (p.personnelIds || []).forEach((id: string) => {
          const per = activeOperativesList.find((x: any) => x.id === id);
          if (per) {
            programmedOperativesSet.add(per.documento);
            laborPersonnelCountMap.get(laborName)?.add(per.documento);
          }
        });
      });

      const programmedCount = programmedOperativesSet.size;
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
        if (!bySupMap.has(p.supervisorId || p.idSupervisor)) {
          bySupMap.set(p.supervisorId || p.idSupervisor, new Set());
        }
        (p.personnelIds || []).forEach((id: string) => {
          const per = activeOperativesList.find((x: any) => x.id === id);
          if (per) bySupMap.get(p.supervisorId || p.idSupervisor)?.add(per.documento);
        });
      });

      const chartBySup = Array.from(bySupMap.entries())
        .map(([supId, set]) => {
          const sup = catalogs.supervisors.find((s: any) => s.id === supId);
          return { name: sup?.name ? sup.name.split(' ')[0] + ' ' + (sup.name.split(' ')[1] || '') : 'Sin Asignar', personas: set.size };
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

      // 5. Top Leaderboard de Inasistentes / Recurrencia
      const absenceRecurrenceMap = new Map<string, { count: number; name: string; cargo: string; zone: string }>();
      
      const selectedMonthPrefix = date.substring(0, 7); // YYYY-MM
      
      filteredAbsences.forEach(a => {
        if (a.status === 'REGISTRADA') {
          if (absencesRange === 'day' && a.date !== date) return;
          if (absencesRange === 'month' && !a.date.startsWith(selectedMonthPrefix)) return;

          const p = catalogs.personnel.find((per: any) => per.id === a.personnelId);
          const name = p ? p.name : 'Personal Desconocido';
          const cargo = p ? (p.jobTitle || 'Operario') : 'Operario';
          const zone = p ? (p.cuadrilla || p.zona || 'Campo') : 'Campo';
          const key = p ? p.id : a.personnelId;

          const current = absenceRecurrenceMap.get(key) || { count: 0, name, cargo, zone };
          absenceRecurrenceMap.set(key, { ...current, count: current.count + 1 });
        }
      });

      const topAbsentees = Array.from(absenceRecurrenceMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        operativesTotal: activeOperativesList.length,
        adminTotal: totalAdmin,
        absencesTotal: inasistentesSet.size,
        incapacityTotal: incapacidadesSet.size,
        vacationsTotal: vacacionesSet.size,
        permissionsTotal: permisosSet.size,
        utilRate: utilRate.toFixed(1),
        programmedCount,
        availableOperativesCount,
        activeMachineryCount,
        totalEquipmentCount,
        chartLabor,
        chartBySup,
        chartAbsences,
        chartMachinery,
        topAbsentees
      };
    }, [date, filteredProgrammings, filteredAbsences, filteredMachineries, catalogs, absencesRange]);

    return (
      <div className="space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-forest-900/10 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-forest-600 animate-pulse"></span>
              <h2 className="text-2xl font-extrabold text-forest-950 tracking-tight">Dashboard Analítico</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Tablero gerencial de inteligencia táctica y control agrónomo</p>
          </div>
          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <div className="flex items-center gap-2 bg-forest-50 px-3 py-1.5 rounded-xl border border-forest-100">
              <Calendar size={16} className="text-forest-700" />
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="bg-transparent border-0 h-8 text-sm font-semibold text-forest-950 focus-visible:ring-0 p-0" 
              />
            </div>
          </div>
        </div>

        {/* Tactical Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Operativos de Campo */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-forest-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operativos Campo</span>
                <div className="p-2 bg-forest-100 text-forest-800 rounded-lg">
                  <Users size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-forest-950">{stats.operativesTotal}</h3>
              <p className="text-[11px] text-gray-500 mt-1">Personal en campo</p>
            </CardContent>
          </Card>

          {/* Card 2: Personal Administrativo */}
          <Card className="border-forest-900/10 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-blue-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administrativos</span>
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <Briefcase size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-blue-950">{stats.adminTotal}</h3>
              <p className="text-[11px] text-gray-500 mt-1">Jefes, oficina, sups.</p>
            </CardContent>
          </Card>

          {/* Card 3: Personas Ausentes */}
          <Card className="border-red-200 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-red-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Ausentes</span>
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <UserX size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-red-700">{stats.absencesTotal}</h3>
              <p className="text-[11px] text-red-600/80 mt-1">Inasistencia del día</p>
            </CardContent>
          </Card>

          {/* Card 4: Personas Incapacitadas */}
          <Card className="border-teal-200 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-teal-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">Incapacitados</span>
                <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                  <Stethoscope size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-teal-900">{stats.incapacityTotal}</h3>
              <p className="text-[11px] text-teal-700/80 mt-1">Licencia médica activa</p>
            </CardContent>
          </Card>

          {/* Card 5: Permisos / Vacaciones */}
          <Card className="border-amber-200 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-amber-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Permisos / Vac.</span>
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <CalendarX size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-amber-900">{stats.permissionsTotal + stats.vacationsTotal}</h3>
              <p className="text-[11px] text-amber-700/80 mt-1">Novedad autorizada</p>
            </CardContent>
          </Card>

          {/* Card 6: Utilización Operativa % */}
          <Card className="border-lime-300 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-lime-50/50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-lime-900 uppercase tracking-wider">Utilización</span>
                <div className="p-2 bg-lime-200 text-lime-800 rounded-lg">
                  <TrendingUp size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-lime-900">{stats.utilRate}%</h3>
              <p className="text-[11px] text-lime-800/80 mt-1">{stats.programmedCount} de {stats.availableOperativesCount} progs.</p>
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
                <div className="h-[260px] flex flex-col items-center justify-center text-sm text-gray-400 gap-2">
                  <CheckCircle2 size={32} className="text-lime-500" />
                  <span>No se registran ausencias ni novedas en esta fecha.</span>
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
                        innerRadius={50} 
                        outerRadius={80} 
                        paddingAngle={4}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {stats.chartAbsences.map((entry, index) => (
                          <Cell key={`cell-abs-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${val} Persona(s)`, 'Total']}
                        contentStyle={{ backgroundColor: '#0B2F24', color: '#fff', borderRadius: '8px', border: 'none' }}
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

        {/* Section 3: Leaderboard / Top de Inasistentes y Recurrencia */}
        <Card className="border-forest-900/10 shadow-xs">
          <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                <Award size={18} className="text-amber-500" /> Leaderboard: Top Inasistencias y Recurrencia
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Monitoreo de frecuencia de ausentismo para control directo</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button 
                onClick={() => setAbsencesRange('month')} 
                className={`px-3 py-1 rounded-lg transition-colors ${absencesRange === 'month' ? 'bg-white text-forest-950 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Mes Actual
              </button>
              <button 
                onClick={() => setAbsencesRange('day')} 
                className={`px-3 py-1 rounded-lg transition-colors ${absencesRange === 'day' ? 'bg-white text-forest-950 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Día Seleccionado
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.topAbsentees.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No se registraron inasistencias recurrentes en este período.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.topAbsentees.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-forest-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          idx === 0 ? 'bg-amber-400 text-amber-950' :
                          idx === 1 ? 'bg-slate-300 text-slate-900' :
                          idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                          {item.count} Ausencia{item.count > 1 ? 's' : ''}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 truncate" title={item.name}>{item.name}</h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{item.cargo}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
                      <span>{item.zone}</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return user?.role === 'DIRECTIVO' ? <DirectivoDashboard /> : <NormalDashboard />;
}

