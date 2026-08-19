import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, cn } from '@/src/components/ui';
import { ChevronDown, ChevronRight, Download, Search } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';

export default function GeneralProgramming({ overrideDate }: { overrideDate?: string }) {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();
  const [date, setDate] = useState(overrideDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const filteredProgrammings = user?.role === 'SUPERVISOR' ? programmings.filter(p => p.idSupervisor === user.idSupervisor) : programmings;
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
      progs.forEach(p => (p.personnelIds||[]).forEach((id: string) => uniquePersonnel.add(id)));
      return { supervisorId: supId, supervisorName: sup?.name || 'Otro', programmings: progs, personnelCount: uniquePersonnel.size };
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
        <Card key={group.supervisorId}>
          <div className="px-4 py-3 bg-gray-50 font-bold" onClick={() => toggleGroup(group.supervisorId)}>
            {group.supervisorName} ({group.personnelCount} personas)
          </div>
          {expandedGroups[group.supervisorId] !== false && (
            <div className="p-4">
              {group.programmings.map(p => (
                <div key={p.id} className="border-b py-2 text-sm">{p.zoneSnapshot} - {p.status}</div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
