import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, cn } from '@/src/components/ui';
import { ChevronDown, ChevronRight, ChevronUp, Download, Search, Copy, Edit2, Trash2, Users, UserCheck, Tractor, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { useNavigate } from 'react-router-dom';
import { calculateDuration } from '../machinery/Machinery';
import { TeamStreakCard } from '../shared/components/TeamStreakCard';

export default function GeneralProgramming({ overrideDate }: { overrideDate?: string }) {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();
  const operationalDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const [date, setDate] = useState(overrideDate || operationalDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedRowPersonnel, setExpandedRowPersonnel] = useState<Record<string, boolean>>({});
  const [expandedRowLotes, setExpandedRowLotes] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const canModify = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta programación? Esta acción depurará el registro permanentemente.')) {
      const res = await repository.deleteProgramming(id);
      if (!res.ok) {
        alert('Error al eliminar la programación: ' + (res.error || 'Desconocido'));
      }
    }
  };

  useEffect(() => { if(overrideDate) setDate(overrideDate); }, [overrideDate]);

  const [programmings, setProgrammings] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);

  useEffect(() => {
    // La racha es global, pero el detalle operativo conserva la vista propia de
    // cada supervisor para no mezclar sus programaciones con las de otros.
    const programmingFilters: any = { date };
    if (user?.role === 'SUPERVISOR' && user.idSupervisor) {
      programmingFilters.supervisorId = user.idSupervisor;
    }
    const unsub1 = repository.subscribeProgramming(programmingFilters, setProgrammings);
    const unsub2 = repository.subscribeMachinery({ date }, setMachineries);
    const unsub3 = repository.subscribeAbsences({ date }, setAbsences);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [date, user]);

  const toggleGroup = (id: string) => setExpandedGroups(p => ({ ...p, [id]: !p[id] }));
  const toggleRowPersonnel = (progId: string) => setExpandedRowPersonnel(p => ({ ...p, [progId]: !p[progId] }));
  const toggleRowLotes = (progId: string) => setExpandedRowLotes(p => ({ ...p, [progId]: !p[progId] }));

  const validProgrammings = programmings.filter(p => p.status === 'CONFIRMADA');
  const filteredProgrammings = user?.role === 'SUPERVISOR'
    ? validProgrammings.filter(programming => programming.idSupervisor === user.idSupervisor)
    : validProgrammings;
  const filteredMachineries = machineries;

  const groupedProgrammings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredProgrammings.forEach(prog => {
      const supId = prog.idSupervisor;
      if (!groups[supId]) groups[supId] = [];
      groups[supId].push(prog);
    });
    return Object.entries(groups).map(([supId, progs]) => {
      const sup = catalogs.supervisors?.find((s:any) => s.id === supId);
      
      const enrichedProgs = progs.map(p => {
        const labor = catalogs.labors?.find((l:any) => l.id === p.laborId);
        const activity = catalogs.activities?.find((a:any) => a.id === p.activityId);
        const ref = catalogs.performanceReferences?.find((r:any) => r.activityId === p.activityId);
        
        const zoneName = p.zoneSnapshot?.split(' - ')[0] || '';
        const locationName = p.zoneSnapshot?.split(' - ')[1] || '';

        // Extract lotes list
        let lotesList: string[] = [];
        if (p.locationIds && Array.isArray(p.locationIds) && p.locationIds.length > 0) {
          lotesList = p.locationIds.map((locId: string) => {
            const loc = catalogs.locations?.find((l: any) => l.id === locId);
            return loc?.name || locId;
          });
        } else if (p.locationId && String(p.locationId).includes(',')) {
          lotesList = String(p.locationId).split(',').map((locId: string) => {
            const loc = catalogs.locations?.find((l: any) => l.id === locId.trim());
            return loc?.name || locId.trim();
          });
        } else if (p.loteSnapshot) {
          lotesList = String(p.loteSnapshot).split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (p.zoneSnapshot?.includes(' - ')) {
          const rawLotePart = p.zoneSnapshot.split(' - ')[1];
          lotesList = rawLotePart ? rawLotePart.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        } else if (p.zoneSnapshot) {
          lotesList = [p.zoneSnapshot];
        } else if (p.locationId) {
          const loc = catalogs.locations?.find((l: any) => l.id === p.locationId);
          lotesList = [loc?.name || p.locationId];
        }
        
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
          lotesList,
          personnelDetails,
          numPeople,
          unit,
          perfDisplay,
          totalDisplay,
          obs: p.observations || '-'
        };
      });

      const personnelCount = new Set(
        enrichedProgs.flatMap(programming => programming.personnelIds || []),
      ).size;

      return { supervisorId: supId, supervisorName: sup?.name || 'Otro', programmings: enrichedProgs, personnelCount };
    });
  }, [filteredProgrammings, catalogs]);

  const handleExportExcel = () => {
    if (groupedProgrammings.length === 0) {
      alert('No hay programaciones registradas para exportar en esta fecha.');
      return;
    }

    const exportDay = date || new Date().toISOString().split('T')[0];
    const exportFormattedDate = new Date().toLocaleDateString('es-CO');
    const exportFormattedTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    // Nombre del documento requerido por el usuario: "PROGRAMACION LABORAL DE CAMPO_"DÍA DE EXPORTACIÓN""
    const docName = `PROGRAMACION LABORAL DE CAMPO_${exportDay}`;
    const fileName = `${docName}.xls`;

    // Totales globales
    const totalSupervisors = groupedProgrammings.length;
    let totalActivities = 0;
    const totalPeopleSet = new Set<string>();

    groupedProgrammings.forEach(g => {
      totalActivities += g.programmings.length;
      g.programmings.forEach((p: any) => {
        (p.personnelIds || []).forEach((id: string) => totalPeopleSet.add(id));
      });
    });

    // Generación de tabla Excel enriquecida con XML y CSS para máxima fidelidad visual
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Programación de Campo</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; color: #1F2937; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #CBD5E1; padding: 6px 10px; vertical-align: middle; }
          .header-main { background-color: #1B5E20; color: #FFFFFF; font-size: 15pt; font-weight: bold; text-align: center; height: 38px; border: 1px solid #14532D; }
          .header-sub { background-color: #2E7D32; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; height: 24px; border: 1px solid #1B5E20; }
          .meta-title { background-color: #F1F5F9; font-weight: bold; color: #334155; font-size: 9pt; }
          .meta-val { background-color: #FFFFFF; font-weight: normal; color: #0F172A; font-size: 9pt; }
          .sup-row { background-color: #C8E6C9; color: #1B5E20; font-size: 11pt; font-weight: bold; height: 30px; border: 1px solid #A5D6A7; }
          .col-header { background-color: #14532D; color: #FFFFFF; font-size: 9pt; font-weight: bold; text-align: center; height: 28px; border: 1px solid #0F172A; }
          .data-cell { font-size: 9pt; vertical-align: top; mso-number-format: "\\@"; }
          .data-cell-center { font-size: 9pt; text-align: center; vertical-align: top; mso-number-format: "\\@"; }
          .data-cell-num { font-size: 9pt; text-align: center; font-weight: bold; vertical-align: top; mso-number-format: "0"; }
          .personnel-cell { font-size: 8.5pt; line-height: 1.4; vertical-align: top; white-space: pre-wrap; mso-number-format: "\\@"; }
          .subtotal-row { background-color: #E8F5E9; font-weight: bold; color: #1B5E20; font-size: 9.5pt; height: 26px; border: 1px solid #C8E6C9; }
          .grand-total { background-color: #1B5E20; color: #FFFFFF; font-weight: bold; font-size: 11pt; height: 34px; text-align: center; border: 1px solid #14532D; }
          .alt-row { background-color: #F8FAFC; }
        </style>
      </head>
      <body>
        <table>
          <!-- ENCABEZADO DEL DOCUMENTO REQUERIDO -->
          <tr>
            <th colspan="10" class="header-main">
              ${docName}
            </th>
          </tr>
          <tr>
            <th colspan="10" class="header-sub">
              OLEOFLORES AGRONÓMICA — CONTROL OPERATIVO DIARIO POR SUPERVISOR Y CUADRILLA
            </th>
          </tr>

          <!-- METADATOS Y RESUMEN GENERAL -->
          <tr>
            <td colspan="2" class="meta-title">FECHA DE PROGRAMACIÓN:</td>
            <td colspan="3" class="meta-val"><b>${exportDay}</b></td>
            <td colspan="2" class="meta-title">FECHA Y HORA DE EXPORTACIÓN:</td>
            <td colspan="3" class="meta-val">${exportFormattedDate} ${exportFormattedTime}</td>
          </tr>
          <tr>
            <td colspan="2" class="meta-title">EXPORTADO POR:</td>
            <td colspan="3" class="meta-val">${user?.name || user?.username || 'Administrador Agronomía'} (${user?.role || 'ADMIN'})</td>
            <td colspan="2" class="meta-title">TOTAL PERSONAL PROGRAMADO:</td>
            <td colspan="3" class="meta-val"><b>${totalPeopleSet.size} colaboradores únicos</b></td>
          </tr>
          <tr>
            <td colspan="2" class="meta-title">SUPERVISORES ACTIVOS:</td>
            <td colspan="3" class="meta-val">${totalSupervisors} supervisores</td>
            <td colspan="2" class="meta-title">TOTAL FRENTES / ACTIVIDADES:</td>
            <td colspan="3" class="meta-val">${totalActivities} actividades programadas</td>
          </tr>
          <tr><td colspan="10" style="height: 12px; border: none;"></td></tr>
    `;

    // Recorrido por cada supervisor
    groupedProgrammings.forEach(group => {
      html += `
        <!-- SUPERVISOR BANNER -->
        <tr>
          <td colspan="10" class="sup-row">
            &nbsp;SUPERVISOR: ${group.supervisorName.toUpperCase()}
          </td>
        </tr>
        <!-- ENCABEZADOS DE COLUMNA -->
        <tr>
          <th class="col-header" style="width: 140px;">ZONA</th>
          <th class="col-header" style="width: 130px;">LABOR</th>
          <th class="col-header" style="width: 220px;">ACTIVIDAD</th>
          <th class="col-header" style="width: 60px;">UN.</th>
          <th class="col-header" style="width: 65px;">N° PERS.</th>
          <th class="col-header" style="width: 330px;">PERSONAL ASIGNADO (NOMBRES Y CÉDULAS)</th>
          <th class="col-header" style="width: 200px;">UBICACIÓN / LOTES</th>
          <th class="col-header" style="width: 110px;">REND. HOMBRE/DÍA</th>
          <th class="col-header" style="width: 120px;">CANTIDAD TOTAL</th>
          <th class="col-header" style="width: 200px;">OBSERVACIONES</th>
        </tr>
      `;

      group.programmings.forEach((p: any, idx: number) => {
        const rowClass = idx % 2 === 1 ? 'alt-row' : '';

        // Nombres completos, documento y cargo de cada persona asignada
        const personnelFormatted = (p.personnelDetails && p.personnelDetails.length > 0)
          ? p.personnelDetails.map((per: any, pIdx: number) => {
              const docPart = per.documento ? `(CC: ${per.documento})` : '';
              const cargoPart = per.jobTitle ? `- ${per.jobTitle}` : '';
              return `${pIdx + 1}. ${per.name} ${docPart} ${cargoPart}`.trim();
            }).join('&#10;')
          : 'Sin colaboradores asignados';

        // Lotes visibles completos
        const lotesFormatted = (p.lotesList && p.lotesList.length > 0)
          ? p.lotesList.join(', ')
          : (p.locationName || p.zoneName || 'Zona General');

        html += `
          <tr class="${rowClass}">
            <td class="data-cell"><b>${p.zoneName || '-'}</b></td>
            <td class="data-cell">${p.laborName || '-'}</td>
            <td class="data-cell">${p.activityName || '-'}</td>
            <td class="data-cell-center">${p.unit || '-'}</td>
            <td class="data-cell-num">${p.numPeople}</td>
            <td class="personnel-cell">${personnelFormatted}</td>
            <td class="data-cell">${lotesFormatted}</td>
            <td class="data-cell-center">${p.perfDisplay || '-'}</td>
            <td class="data-cell-center">${p.totalDisplay || '-'}</td>
            <td class="data-cell">${p.obs || '-'}</td>
          </tr>
        `;
      });

      html += `<tr><td colspan="10" style="height: 10px; border: none;"></td></tr>`;
    });

    // Total general
    html += `
        <tr>
          <td colspan="10" class="grand-total">
            TOTAL GENERAL: ${totalSupervisors} SUPERVISORES &nbsp;|&nbsp; ${totalActivities} ACTIVIDADES &nbsp;|&nbsp; ${totalPeopleSet.size} COLABORADORES PROGRAMADOS
          </td>
        </tr>
      </table>
      </body>
      </html>
    `;

    // Descarga directa con BOM UTF-8 (\uFEFF) para garantizar acentos perfectos en Excel
    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-forest-900/10 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-forest-950">Programación General</h2>
          <p className="text-xs text-gray-500 mt-0.5">Control operativo diario por cuadrilla y supervisor</p>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {user?.role === 'ADMIN' && (
            <Button 
              onClick={handleExportExcel}
              disabled={groupedProgrammings.length === 0}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm px-3.5 h-8 rounded-lg cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Descargar archivo Excel con la programación general visible y detallada"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </Button>
          )}

          <div className="flex items-center gap-2 bg-forest-50 px-3 py-1.5 rounded-lg border border-forest-200">
            <Input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="bg-transparent border-0 h-7 text-sm font-semibold text-forest-950 focus-visible:ring-0 p-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* El revisor consulta únicamente la programación, sin el panel de racha. */}
      {user?.role !== 'REVISOR' && <TeamStreakCard date={operationalDate} />}
      
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
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-forest-50 hover:bg-forest-100 text-forest-950 border-2 border-forest-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                                title="Clic para desplegar lista vertical de personal"
                              >
                                <Users size={14} className="text-forest-800 group-hover:text-forest-950" />
                                <span>Ver {p.numPeople} {p.numPeople === 1 ? 'Persona' : 'Personas'}</span>
                                <ChevronDown size={14} className="text-forest-700 group-hover:text-forest-950 transition-transform" />
                              </button>
                            ) : (
                              <div className="space-y-2 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleRowPersonnel(p.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-forest-900 hover:bg-forest-950 text-white shadow-2xs transition-all cursor-pointer"
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

                          <td className="px-4 py-3 border-r text-gray-700">
                            {(!p.lotesList || p.lotesList.length === 0) ? (
                              <span className="text-gray-400">{p.locationName || '-'}</span>
                            ) : p.lotesList.length === 1 ? (
                              <span className="font-medium text-forest-950">{p.lotesList[0]}</span>
                            ) : (
                              <div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => toggleRowLotes(p.id)}
                                  className={cn(
                                    "h-7 px-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1 rounded-md border-2 transition-all cursor-pointer",
                                    expandedRowLotes[p.id] 
                                      ? "bg-forest-900 text-white border-forest-950" 
                                      : "bg-white text-forest-900 border-forest-900/30 hover:border-forest-900 hover:bg-forest-50"
                                  )}
                                >
                                  <span>{expandedRowLotes[p.id] ? `Ocultar (${p.lotesList.length})` : `Ver ${p.lotesList.length} lotes`}</span>
                                  {expandedRowLotes[p.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </Button>

                                {expandedRowLotes[p.id] && (
                                  <div className="mt-2 p-2 bg-forest-50/90 border border-forest-200 rounded-md text-left shadow-xs">
                                    <div className="text-[10px] font-bold text-forest-900 uppercase tracking-wider mb-1">
                                      Lotes ({p.lotesList.length}):
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {p.lotesList.map((loteName: string, idx: number) => (
                                        <span 
                                          key={idx} 
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-white text-forest-950 border border-forest-300 shadow-2xs"
                                        >
                                          {loteName}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r text-center text-gray-700">{p.perfDisplay}</td>
                          <td className="px-4 py-3 border-r text-center font-bold text-forest-900">{p.totalDisplay}</td>
                          <td className="px-4 py-3 border-r max-w-[200px] whitespace-normal text-xs text-gray-600">{p.obs}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canModify && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Editar programación"
                                  onClick={() => navigate('/programming/new', { state: { editRecord: p } })}
                                  className="h-8 w-8 text-forest-800 hover:text-forest-950 hover:bg-forest-100 p-0"
                                >
                                  <Edit2 size={15} />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Duplicar programación"
                                onClick={() => navigate('/programming/new', { state: { cloneTemplate: p } })}
                                className="h-8 w-8 text-gray-500 hover:text-forest-800 hover:bg-forest-50 p-0"
                              >
                                <Copy size={15} />
                              </Button>
                              {canModify && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Eliminar programación"
                                  onClick={() => handleDelete(p.id)}
                                  className="h-8 w-8 text-negative hover:text-red-700 hover:bg-red-50 p-0"
                                >
                                  <Trash2 size={15} />
                                </Button>
                              )}
                            </div>
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

      {/* Operaciones de Maquinaria y Tractoristas del Día */}
      {filteredMachineries.length > 0 && (
        <Card className="border-forest-900/15 shadow-sm overflow-hidden bg-white mt-8">
          <CardHeader className="bg-gradient-to-r from-forest-900 via-forest-950 to-forest-900 text-white p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lime-400/20 text-lime-300 rounded-lg">
                <Tractor size={20} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-tight">Operaciones de Maquinaria y Tractoristas</CardTitle>
                <p className="text-xs text-forest-200">Personal y equipos mecanizados programados en la jornada ({date})</p>
              </div>
            </div>
            <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-lime-400 text-forest-950 shadow-xs">
              {filteredMachineries.length} Operación{filteredMachineries.length > 1 ? 'es' : ''}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-forest-50 text-forest-950 font-bold border-b border-forest-200 uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Tractor / Equipo</th>
                    <th className="px-4 py-3">Operador (Tractorista)</th>
                    <th className="px-4 py-3">Labor y Actividad</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3">Horario</th>
                    <th className="px-4 py-3">Observaciones</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMachineries.map((m: any) => {
                    const eq = catalogs.equipment?.find((e: any) => e.id === m.equipmentId);
                    const op = catalogs.personnel?.find((p: any) => p.id === m.operatorId);
                    const labor = catalogs.labors?.find((l: any) => l.id === (m.laborId || m.labor_id));
                    const act = catalogs.activities?.find((a: any) => a.id === (m.activityId || m.activity_id));
                    return (
                      <tr key={m.id} className="hover:bg-forest-50/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-forest-950 text-sm">
                          {eq?.code ? `${eq.code} - ${eq.name}` : (eq?.name || 'Equipo')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{op?.name || m.operatorName || 'Sin asignar'}</div>
                          {op?.jobTitle && <div className="text-[10px] text-gray-500">{op.jobTitle}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-forest-900">{labor?.name || 'Maquinaria'}</span>
                          {act?.name && <span className="text-gray-600 font-normal"> ({act.name})</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {m.zoneSnapshot || '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700 text-[11px]">
                          {m.startTime ? (
                            <span>
                              {m.startTime}{m.endTime ? ` a ${m.endTime}` : ''}
                              {calculateDuration(m.startTime, m.endTime) && (
                                <span className="ml-1.5 font-sans font-bold text-forest-900 bg-lime-100 border border-lime-300 px-1.5 py-0.5 rounded text-[10px]">
                                  {calculateDuration(m.startTime, m.endTime)}
                                </span>
                              )}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                          {m.observations || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] rounded-full font-bold uppercase",
                            m.status === 'EN_PROGRESO' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            m.status === 'FINALIZADA' ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"
                          )}>
                            {m.status?.replace('_', ' ') || 'ACTIVA'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

