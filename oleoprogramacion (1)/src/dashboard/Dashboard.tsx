import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Input } from '@/src/components/ui';
import { Users, CalendarCheck, CalendarX, Tractor } from 'lucide-react';
import GeneralProgramming from '../programming/GeneralProgramming';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  
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

  if (loading) return <div>Cargando dashboard...</div>;

  const filteredProgrammings = programmings;
  const filteredMachineries = machineries;
  const filteredAbsences = absences;

  const NormalDashboard = () => {
    const uniquePersonnel = new Set<string>();
    filteredProgrammings.filter(p => p.status === 'CONFIRMADA').forEach(p => (p.personnelIds || []).forEach((id: string) => uniquePersonnel.add(id)));
    
    const confirmedCount = filteredProgrammings.filter(p => p.status === 'CONFIRMADA').length;
    const machineryCount = filteredMachineries.filter(m => m.status !== 'CANCELADA').length;
    const absencesCount = filteredAbsences.filter(a => a.status === 'REGISTRADA').length;
    
    const totalActive = catalogs.personnel.filter((p:any) => p.active).length;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-forest-950">Panel de Control</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-lime-100 text-lime-700 rounded-lg"><Users size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Personal Programado</p><h3 className="text-2xl font-bold text-forest-950">{uniquePersonnel.size} <span className="text-sm font-normal text-gray-500">/ {totalActive - absencesCount}</span></h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-green-100 text-green-700 rounded-lg"><CalendarCheck size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Progs. Confirmadas</p><h3 className="text-2xl font-bold text-forest-950">{confirmedCount}</h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><CalendarX size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Ausencias / Novedades</p><h3 className="text-2xl font-bold text-forest-950">{absencesCount}</h3></div></CardContent></Card>
          <Card className="border-forest-900/10 shadow-sm"><CardContent className="p-6 flex items-center space-x-4"><div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><Tractor size={24} /></div><div><p className="text-sm font-medium text-text-secondary">Maquinaria Activa</p><h3 className="text-2xl font-bold text-forest-950">{machineryCount}</h3></div></CardContent></Card>
        </div>
      </div>
    );
  };

  const DirectivoDashboard = () => {
    const stats = useMemo(() => {
      const activePersonnel = catalogs.personnel.filter((p:any) => p.active);
      const activeNovedades = catalogs.personnelNovelties.filter((n:any) => n.fechaInicio <= date && n.fechaFin >= date);

      let inasistentes = new Set<string>();
      let permisos = new Set<string>();
      let vacaciones = new Set<string>();
      let incapacidades = new Set<string>();

      activeNovedades.forEach((n:any) => {
        if (n.tipo === 'VACACIONES') vacaciones.add(n.personaDocumento);
        else if (n.tipo === 'INCAPACIDAD') incapacidades.add(n.personaDocumento);
        else if (n.tipo === 'PERMISO' || n.tipo === 'Permiso autorizado') permisos.add(n.personaDocumento);
        else inasistentes.add(n.personaDocumento);
      });

      absences.forEach((a:any) => {
        const p = activePersonnel.find((per:any) => per.id === a.personnelId);
        if (p) {
          if (a.reason === 'Vacaciones') vacaciones.add(p.documento);
          else if (a.reason === 'Incapacidad') incapacidades.add(p.documento);
          else if (a.reason === 'Permiso autorizado' || a.reason === 'PERMISO') permisos.add(p.documento);
          else inasistentes.add(p.documento);
        }
      });

      incapacidades.forEach(id => vacaciones.has(id) && incapacidades.delete(id));
      permisos.forEach(id => (vacaciones.has(id) || incapacidades.has(id)) && permisos.delete(id));
      inasistentes.forEach(id => (vacaciones.has(id) || incapacidades.has(id) || permisos.has(id)) && inasistentes.delete(id));

      const totalUnavailable = vacaciones.size + incapacidades.size + permisos.size + inasistentes.size;
      const availableCount = activePersonnel.length - totalUnavailable;

      let programmedSet = new Set<string>();
      programmings.forEach(p => (p.personnelIds||[]).forEach((id:string) => {
        const per = activePersonnel.find((x:any) => x.id === id);
        if (per) programmedSet.add(per.documento);
      }));

      const programmedCount = programmedSet.size;
      const availableNotProgrammed = availableCount - programmedCount;
      const utilRate = availableCount > 0 ? (programmedCount / availableCount) * 100 : 0;

      const bySupMap = new Map<string, Set<string>>();
      programmings.forEach(p => {
        if (!bySupMap.has(p.idSupervisor)) bySupMap.set(p.idSupervisor, new Set());
        (p.personnelIds||[]).forEach((id:string) => {
           const per = activePersonnel.find((x:any) => x.id === id);
           if (per) bySupMap.get(p.idSupervisor)?.add(per.documento);
        });
      });
      const chartBySup = Array.from(bySupMap.entries()).map(([supId, set]) => {
         const sup = catalogs.supervisors.find((s:any) => s.id === supId);
         return { name: sup?.name || 'Otro', personas: set.size };
      }).sort((a,b) => b.personas - a.personas).slice(0, 10);

      const chartState = [
        { name: 'Programado', value: programmedCount, fill: '#7FA33D' },
        { name: 'Disp. Sin Prog.', value: Math.max(0, availableNotProgrammed), fill: '#B9CF58' },
        { name: 'Inasistente', value: inasistentes.size, fill: '#B42318' },
        { name: 'Permiso', value: permisos.size, fill: '#E6B94F' },
        { name: 'Vacaciones', value: vacaciones.size, fill: '#607069' },
        { name: 'Incapacidad', value: incapacidades.size, fill: '#123C2E' },
      ].filter(x => x.value > 0);

      return {
        active: activePersonnel.length, available: availableCount, programmed: programmedCount,
        notProgrammed: Math.max(0, availableNotProgrammed), absences: inasistentes.size, permissions: permisos.size,
        vacations: vacaciones.size, incapacity: incapacidades.size, utilRate: utilRate.toFixed(1),
        chartBySup, chartState
      };
    }, [date, programmings, absences, catalogs]);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-forest-950">Dashboard Analítico</h2>
            <p className="text-sm text-text-secondary mt-1">Visión gerencial de programación y ausentismo</p>
          </div>
          <div className="flex gap-2">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="border-forest-900/10"><CardContent className="p-4"><p className="text-xs text-text-secondary">Activos</p><h3 className="text-xl font-bold">{stats.active}</h3></CardContent></Card>
          <Card className="border-forest-900/10"><CardContent className="p-4"><p className="text-xs text-text-secondary">Disponibles</p><h3 className="text-xl font-bold text-forest-700">{stats.available}</h3></CardContent></Card>
          <Card className="border-forest-900/10"><CardContent className="p-4"><p className="text-xs text-text-secondary">Programados</p><h3 className="text-xl font-bold text-lime-600">{stats.programmed}</h3></CardContent></Card>
          <Card className="border-forest-900/10"><CardContent className="p-4"><p className="text-xs text-text-secondary">Sin Programar</p><h3 className="text-xl font-bold text-amber-600">{stats.notProgrammed}</h3></CardContent></Card>
          <Card className="border-forest-900/10"><CardContent className="p-4"><p className="text-xs text-text-secondary">Utilización</p><h3 className="text-xl font-bold text-forest-900">{stats.utilRate}%</h3></CardContent></Card>
          <Card className="border-forest-900/10"><CardContent className="p-4"><p className="text-xs text-text-secondary">Permisos</p><h3 className="text-xl font-bold text-amber-600">{stats.permissions}</h3></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-forest-900/10">
            <CardHeader><CardTitle className="text-sm">Distribución de Personal por Supervisor</CardTitle></CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartBySup} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Bar dataKey="personas" fill="#7FA33D" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-forest-900/10">
            <CardHeader><CardTitle className="text-sm">Estado General del Personal</CardTitle></CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.chartState} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} label>
                    {stats.chartState.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
           <GeneralProgramming overrideDate={date} />
        </div>
      </div>
    );
  };

  return user?.role === 'DIRECTIVO' ? <DirectivoDashboard /> : <NormalDashboard />;
}
