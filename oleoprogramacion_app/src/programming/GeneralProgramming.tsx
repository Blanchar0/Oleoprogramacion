import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, cn } from '@/src/components/ui';
import { ChevronDown, ChevronRight, Download, Search, Copy } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { useNavigate } from 'react-router-dom';

export default function GeneralProgramming({ overrideDate }: { overrideDate?: string }) {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();
  const [date, setDate] = useState(overrideDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => { if(overrideDate) setDate(overrideDate); }, [overrideDate]);

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

  const toggleGroup = (id: string) => setExpandedGroups(p => ({ ...p, [id]: !p[id] }));

  const validProgrammings = programmings.filter(p => p.status !== 'RECHAZADA');
  const filteredProgrammings = user?.role === 'SUPERVISOR' ? validProgrammings.filter(p => p.idSupervisor === user.idSupervisor) : validProgrammings;
  const filteredMachineries = user?.role === 'SUPERVISOR' ? machineries.filter(m => m.idSupervisor === user.idSupervisor) : machineries;

  const groupedProgrammings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredProgrammings.forEach(prog => {
      const supId = prog.idSupervisor;
      if (!groups[supId]) groups[supId] = [];
      groups[supId].push(prog);
    });
    return Object.entries(groups).map(([supId, progs]) => {
      const sup = catalogs.supervisors?.find((s:any) => s.id === supId);
      const uniquePersonnel = new Set();
      
      const enrichedProgs = progs.map(p => {
        (p.personnelIds||[]).forEach((id: string) => uniquePersonnel.add(id));
        
        const labor = catalogs.labors?.find((l:any) => l.id === p.laborId);
        const activity = catalogs.activities?.find((a:any) => a.id === p.activityId);
        const ref = catalogs.performanceReferences?.find((r:any) => r.activityId === p.activityId);
        
        const zoneName = p.zoneSnapshot?.split(' - ')[0] || '';
        const locationName = p.zoneSnapshot?.split(' - ')[1] || '';
        const personnelNames = (p.personnelIds||[]).map((id:string) => catalogs.personnel?.find((per:any) => per.id === id)?.name).filter(Boolean).join(', ');
        const numPeople = p.personnelIds?.length || 0;
        
        const unit = ref?.unit || '-';
        const perf = ref?.performancePerPersonDay || 0;
        // Format decimal display if needed
        const perfDisplay = perf ? parseFloat(perf).toLocaleString('es-CO') : '-';
        const totalDisplay = perf ? (perf * numPeople).toLocaleString('es-CO') : '-';

        return {
          ...p,
          laborName: labor?.name || '-',
          activityName: activity?.name || '-',
          zoneName,
          locationName,
          personnelNames,
          numPeople,
          unit,
          perfDisplay,
          totalDisplay,
          obs: p.observations || '-'
        };
      });

      return { supervisorId: supId, supervisorName: sup?.name || 'Otro', programmings: enrichedProgs, personnelCount: uniquePersonnel.size };
    });
  }, [filteredProgrammings, catalogs]);

  const handleExport = () => { /* Export logic */ };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Programación General</h2>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      
      {groupedProgrammings.map(group => (
        <Card key={group.supervisorId} className="overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-[#C8E6C9] text-[#1B5E20] font-bold border-b border-[#A5D6A7] flex justify-between cursor-pointer hover:bg-[#A5D6A7] transition-colors" onClick={() => toggleGroup(group.supervisorId)}>
            <div className="flex items-center gap-2">
              {expandedGroups[group.supervisorId] !== false ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span>Supervisor: {group.supervisorName.toUpperCase()}</span>
            </div>
            <span>{group.personnelCount} personas</span>
          </div>
          {expandedGroups[group.supervisorId] !== false && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-r">Zona</th>
                    <th className="px-4 py-3 font-semibold border-r">Labor</th>
                    <th className="px-4 py-3 font-semibold border-r">Actividad</th>
                    <th className="px-4 py-3 font-semibold border-r text-center">Un.</th>
                    <th className="px-4 py-3 font-semibold border-r text-center">N°</th>
                    <th className="px-4 py-3 font-semibold border-r min-w-[250px] whitespace-normal">Nombres</th>
                    <th className="px-4 py-3 font-semibold border-r">Ubicación/lote</th>
                    <th className="px-4 py-3 font-semibold border-r text-center leading-tight">Rend.<br/>Hombre/día</th>
                    <th className="px-4 py-3 font-semibold border-r text-center leading-tight">Cantidad total<br/>a realizar</th>
                    <th className="px-4 py-3 font-semibold border-r max-w-[200px] whitespace-normal">Observaciones</th>
                    <th className="px-4 py-3 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.programmings.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r">{p.zoneName}</td>
                      <td className="px-4 py-2 border-r">{p.laborName}</td>
                      <td className="px-4 py-2 border-r">{p.activityName}</td>
                      <td className="px-4 py-2 border-r text-center">{p.unit}</td>
                      <td className="px-4 py-2 border-r text-center font-medium">{p.numPeople}</td>
                      <td className="px-4 py-2 border-r whitespace-normal break-words leading-snug">{p.personnelNames}</td>
                      <td className="px-4 py-2 border-r">{p.locationName}</td>
                      <td className="px-4 py-2 border-r text-center">{p.perfDisplay}</td>
                      <td className="px-4 py-2 border-r text-center font-semibold">{p.totalDisplay}</td>
                      <td className="px-4 py-2 border-r max-w-[200px] whitespace-normal text-xs text-gray-600">{p.obs}</td>
                      <td className="px-4 py-2 text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Duplicar programación"
                          onClick={() => navigate('/programming/new', { state: { cloneTemplate: p } })}
                        >
                          <Copy size={16} className="text-gray-500 hover:text-primary" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
