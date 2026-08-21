import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, cn } from '@/src/components/ui';
import { ChevronDown, ChevronRight, ChevronUp, Download, Search, Copy, Users, UserCheck } from 'lucide-react';
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
  const [expandedRowPersonnel, setExpandedRowPersonnel] = useState<Record<string, boolean>>({});
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
  const toggleRowPersonnel = (progId: string) => setExpandedRowPersonnel(p => ({ ...p, [progId]: !p[progId] }));

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
        
        const personnelDetails = (p.personnelIds || []).map((id: string) => {
          const person = catalogs.personnel?.find((per: any) => per.id === id);
          return {
            id,
            name: person?.name || id,
            documento: person?.documento || '',
            jobTitle: person?.jobTitle || person?.laborCargo || ''
          };
        });

        const numPeople = p.personnelIds?.length || 0;
        
        const unit = activity?.unit || '-';
        const perf = p.performancePerPerson !== undefined ? p.performancePerPerson : (ref?.performancePerPersonDay || 0);
        const total = p.expectedTotalQuantity !== undefined ? p.expectedTotalQuantity : (perf * numPeople);
        
        const perfDisplay = perf ? parseFloat(perf.toString()).toLocaleString('es-CO') : '-';
        const totalDisplay = total ? parseFloat(total.toString()).toLocaleString('es-CO') : '-';

        return {
          ...p,
          laborName: labor?.name || '-',
          activityName: activity?.name || '-',
          zoneName,
          locationName,
          personnelDetails,
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-forest-900 font-medium text-sm">Cargando programación...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-forest-900/10 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-forest-950">Programación General</h2>
          <p className="text-xs text-gray-500 mt-0.5">Control operativo diario por cuadrilla y supervisor</p>
        </div>
        <div className="flex items-center gap-2 bg-forest-50 px-3 py-1.5 rounded-lg border border-forest-200">
          <Input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="bg-transparent border-0 h-7 text-sm font-semibold text-forest-950 focus-visible:ring-0 p-0"
          />
        </div>
      </div>
      
      {groupedProgrammings.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-400 text-sm">
          No hay programaciones registradas para la fecha seleccionada.
        </div>
      ) : (
        groupedProgrammings.map(group => (
          <Card key={group.supervisorId} className="overflow-hidden shadow-xs border-forest-900/10">
            <div 
              className="px-4 py-3 bg-[#C8E6C9] text-[#1B5E20] font-bold border-b border-[#A5D6A7] flex justify-between items-center cursor-pointer hover:bg-[#B9DFBA] transition-colors select-none" 
              onClick={() => toggleGroup(group.supervisorId)}
            >
              <div className="flex items-center gap-2.5">
                {expandedGroups[group.supervisorId] !== false ? (
                  <ChevronDown size={18} className="text-[#1B5E20]" />
                ) : (
                  <ChevronRight size={18} className="text-[#1B5E20]" />
                )}
                <span className="tracking-wide">Supervisor: {group.supervisorName.toUpperCase()}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#1B5E20]/15 text-[#1B5E20]">
                {group.personnelCount} personas asignadas
              </span>
            </div>

            {expandedGroups[group.supervisorId] !== false && (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-r">Zona</th>
                      <th className="px-4 py-3 border-r">Labor</th>
                      <th className="px-4 py-3 border-r">Actividad</th>
                      <th className="px-4 py-3 border-r text-center">Un.</th>
                      <th className="px-4 py-3 border-r text-center">N°</th>
                      <th className="px-4 py-3 border-r min-w-[200px]">Nombres</th>
                      <th className="px-4 py-3 border-r">Ubicación/lote</th>
                      <th className="px-4 py-3 border-r text-center leading-tight">Rend.<br/>Hombre/día</th>
                      <th className="px-4 py-3 border-r text-center leading-tight">Cantidad total<br/>a realizar</th>
                      <th className="px-4 py-3 border-r max-w-[200px] whitespace-normal">Observaciones</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.programmings.map(p => {
                      const isExpanded = !!expandedRowPersonnel[p.id];
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors align-top">
                          <td className="px-4 py-3 border-r font-medium text-gray-900">{p.zoneName}</td>
                          <td className="px-4 py-3 border-r text-gray-800">{p.laborName}</td>
                          <td className="px-4 py-3 border-r text-gray-800">{p.activityName}</td>
                          <td className="px-4 py-3 border-r text-center text-gray-600">{p.unit}</td>
                          <td className="px-4 py-3 border-r text-center font-bold text-forest-900">{p.numPeople}</td>
                          
                          {/* Columna comprimible interactiva de Nombres */}
                          <td className="px-4 py-3 border-r">
                            {p.numPeople === 0 ? (
                              <span className="text-gray-400 text-xs italic">Sin personas</span>
                            ) : !isExpanded ? (
                              <button
                                type="button"
                                onClick={() => toggleRowPersonnel(p.id)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest-50 hover:bg-forest-100 text-forest-900 border border-forest-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                                title="Clic para desplegar lista vertical de personal"
                              >
                                <Users size={14} className="text-forest-700 group-hover:text-forest-900" />
                                <span>Ver {p.numPeople} {p.numPeople === 1 ? 'persona' : 'personas'}</span>
                                <ChevronDown size={14} className="text-forest-600 group-hover:text-forest-900 transition-transform" />
                              </button>
                            ) : (
                              <div className="space-y-2 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleRowPersonnel(p.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-forest-800 hover:bg-forest-900 text-white shadow-2xs transition-all cursor-pointer"
                                  title="Clic para contraer lista"
                                >
                                  <Users size={13} />
                                  <span>Ocultar ({p.numPeople})</span>
                                  <ChevronUp size={13} />
                                </button>
                                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                                  {p.personnelDetails.map((person: any, idx: number) => (
                                    <div 
                                      key={person.id || idx} 
                                      className="flex items-center gap-2 px-2 py-1.5 bg-white rounded-md border border-gray-200 text-xs shadow-2xs hover:border-forest-400 transition-colors"
                                    >
                                      <span className="w-5 h-5 rounded-full bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                                        {idx + 1}
                                      </span>
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-semibold text-gray-900 leading-snug">
                                          {person.name}
                                        </span>
                                        {person.jobTitle && (
                                          <span className="text-[10px] text-gray-500 leading-none mt-0.5">
                                            {person.jobTitle}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 border-r text-gray-700">{p.locationName}</td>
                          <td className="px-4 py-3 border-r text-center text-gray-700">{p.perfDisplay}</td>
                          <td className="px-4 py-3 border-r text-center font-bold text-forest-900">{p.totalDisplay}</td>
                          <td className="px-4 py-3 border-r max-w-[200px] whitespace-normal text-xs text-gray-600">{p.obs}</td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Duplicar programación"
                              onClick={() => navigate('/programming/new', { state: { cloneTemplate: p } })}
                              className="h-8 w-8 hover:bg-forest-50"
                            >
                              <Copy size={15} className="text-gray-500 hover:text-forest-800" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

