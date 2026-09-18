import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileSpreadsheet, LayoutDashboard, ListFilter, Loader2, Upload, X, History, KanbanSquare } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/src/components/ui';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { parseCycleFile } from '../shared/spreadsheetImport';
import { buildCycleCards, cycleAgeValue, cycleStateLabel, DEFAULT_CYCLE_RULES, differenceInDays, fromIsoDate, getCycleState, toIsoDate, type CycleCard } from './cycleLogic';
import type { CycleExecution, CycleImport, CycleLaborRule, CycleStatus } from '../types';

type View = 'resumen' | 'kanban' | 'cronograma' | 'historial';

const STATUS_META: Record<CycleStatus, { label: string; chip: string; card: string; dot: string }> = {
  AL_DIA: { label: 'Al día', chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', card: 'border-emerald-200 bg-emerald-50/40', dot: 'bg-emerald-500' },
  ALERTA: { label: 'Alerta', chip: 'bg-amber-100 text-amber-900 border-amber-200', card: 'border-amber-200 bg-amber-50/40', dot: 'bg-amber-500' },
  CRITICO: { label: 'Crítico', chip: 'bg-red-100 text-red-800 border-red-200', card: 'border-red-200 bg-red-50/40', dot: 'bg-red-500' },
  SIN_DATOS: { label: 'Sin datos', chip: 'bg-slate-100 text-slate-700 border-slate-200', card: 'border-slate-200 bg-slate-50/60', dot: 'bg-slate-400' },
};

const numberFormatter = new Intl.NumberFormat('es-CO');

function stateClass(state: CycleStatus) {
  return STATUS_META[state].chip;
}

function formatDate(date: string | null | undefined) {
  if (!date) return 'Sin registro';
  return fromIsoDate(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function cycleValueAtDate(executions: CycleExecution[], loteCode: string, laborCode: string, date: Date, rule: CycleLaborRule) {
  const start = toIsoDate(date);
  const end = new Date(date);
  if (rule.scheduleGranularity === 'SEMANA') end.setDate(end.getDate() + 6);
  const endValue = toIsoDate(end);
  const executedDuringPeriod = executions.some((item) =>
    item.loteCode === loteCode &&
    item.laborCode === laborCode &&
    item.executionDate >= start &&
    item.executionDate <= endValue,
  );
  if (executedDuringPeriod) return 0;
  const last = executions
    .filter((item) => item.loteCode === loteCode && item.laborCode === laborCode && item.executionDate <= endValue)
    .sort((a, b) => b.executionDate.localeCompare(a.executionDate))[0];
  if (!last) return null;
  return cycleAgeValue(differenceInDays(last.executionDate, end), rule.scheduleGranularity);
}

export default function Cycles() {
  const { user } = useAuth();
  const { catalogs } = useCatalogs();
  const [view, setView] = useState<View>('resumen');
  const [data, setData] = useState<{ rules: CycleLaborRule[]; executions: CycleExecution[]; imports: CycleImport[] }>({ rules: [], executions: [], imports: [] });
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState(toIsoDate(new Date()));
  const [zone, setZone] = useState('TODAS');
  const [laborCode, setLaborCode] = useState('COSECHA');
  const [uploadPreview, setUploadPreview] = useState<Awaited<ReturnType<typeof parseCycleFile>> & { file: File } | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = repository.subscribeCycles((next) => {
      setData(next);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const rules = data.rules.length ? data.rules : DEFAULT_CYCLE_RULES;
  const selectedRule = rules.find((rule) => rule.id === laborCode) || rules[0];
  const zones = useMemo(() => Array.from(new Set((catalogs.locations || []).map((item: any) => item.zone).filter(Boolean))).sort(), [catalogs.locations]);
  const cards = useMemo(() => buildCycleCards(data.executions, catalogs.locations || [], rules, fromIsoDate(asOf)), [data.executions, catalogs.locations, rules, asOf]);
  const filteredCards = useMemo(() => cards.filter((card) => (zone === 'TODAS' || card.zone === zone)), [cards, zone]);
  const selectedCards = useMemo(() => filteredCards.filter((card) => card.labor.id === selectedRule?.id), [filteredCards, selectedRule]);
  const statusCounts = useMemo(() => ({
    AL_DIA: filteredCards.filter((card) => card.state === 'AL_DIA').length,
    ALERTA: filteredCards.filter((card) => card.state === 'ALERTA').length,
    CRITICO: filteredCards.filter((card) => card.state === 'CRITICO').length,
    SIN_DATOS: filteredCards.filter((card) => card.state === 'SIN_DATOS').length,
  }), [filteredCards]);

  const chartData = useMemo(() => rules.map((rule) => {
    const cardsForLabor = filteredCards.filter((card) => card.labor.id === rule.id);
    return {
      labor: rule.name,
      'Al día': cardsForLabor.filter((card) => card.state === 'AL_DIA').length,
      Alerta: cardsForLabor.filter((card) => card.state === 'ALERTA').length,
      Crítico: cardsForLabor.filter((card) => card.state === 'CRITICO').length,
      'Sin datos': cardsForLabor.filter((card) => card.state === 'SIN_DATOS').length,
    };
  }), [rules, filteredCards]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setNotice(null);
    try {
      const parsed = await parseCycleFile(file);
      setUploadPreview({ ...parsed, file });
    } catch {
      setNotice('No se pudo leer el archivo. Selecciona un Excel o CSV con la hoja Ciclos.');
    }
  };

  const confirmImport = async () => {
    if (!uploadPreview || !user) return;
    setImporting(true);
    const result = await repository.importCycleExecutions({
      fileName: uploadPreview.file.name,
      fileType: uploadPreview.file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'XLSX',
      importedBy: user.id,
      rows: uploadPreview.rows,
      errors: uploadPreview.errors,
    });
    setImporting(false);
    if (result.ok) {
      setNotice(`Importación completada: ${uploadPreview.rows.length} registros actualizados.`);
      setUploadPreview(null);
    } else {
      setNotice(result.error || 'No fue posible guardar la importación. Verifica que la migración esté aplicada.');
    }
  };

  const tabs: Array<{ id: View; label: string; icon: React.ElementType }> = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban', icon: KanbanSquare },
    { id: 'cronograma', label: 'Cronograma', icon: CalendarDays },
    { id: 'historial', label: 'Historial', icon: History },
  ];

  if (loading) {
    return <div className="min-h-[360px] flex flex-col items-center justify-center gap-3 text-forest-800"><Loader2 className="animate-spin" size={32} /><p className="text-sm font-medium">Cargando control de ciclos…</p></div>;
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-forest-200 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-800 text-white shadow-md">
        <CardContent className="p-5 md:p-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lime-300 text-xs font-extrabold uppercase tracking-wider"><Clock3 size={15} /> Control operativo</div>
            <h2 className="text-2xl font-bold mt-1">Ciclos de labores</h2>
            <p className="text-sm text-white/75 mt-1 max-w-2xl">Cronograma y alertas calculados desde la carga validada de la hoja Ciclos.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="text-xs font-semibold text-white/80 flex flex-col gap-1">Fecha de corte<Input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} className="h-9 bg-white text-forest-950 border-0" /></label>
            <label className="text-xs font-semibold text-white/80 flex flex-col gap-1">Zona<select value={zone} onChange={(event) => setZone(event.target.value)} className="h-9 px-3 rounded-lg bg-white text-forest-950 text-sm"><option value="TODAS">Todas las zonas</option>{zones.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            {user?.role === 'ADMIN' && <Button onClick={() => fileInputRef.current?.click()} variant="accent" className="self-end"><Upload size={16} className="mr-2" />Importar ciclos</Button>}
            <input ref={fileInputRef} className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </div>
        </CardContent>
      </Card>

      {notice && <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>{notice}</span><button aria-label="Cerrar aviso" onClick={() => setNotice(null)}><X size={16} /></button></div>}

      {uploadPreview && <Card className="border-blue-200 bg-blue-50/50"><CardContent className="p-4 md:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold text-forest-950 flex items-center gap-2"><FileSpreadsheet size={18} className="text-blue-600" />Vista previa: {uploadPreview.file.name}</p><p className="text-sm text-gray-600 mt-1">{uploadPreview.rows.length} válidos de {uploadPreview.sourceRows} filas. {uploadPreview.errors.length} observación(es) no se importarán.</p>{uploadPreview.errors.length > 0 && <p className="text-xs text-red-700 mt-1">{uploadPreview.errors.slice(0, 2).join(' · ')}</p>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => setUploadPreview(null)}>Cancelar</Button><Button disabled={!uploadPreview.rows.length || importing} onClick={confirmImport}>{importing ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}Confirmar carga</Button></div></div></CardContent></Card>}

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => <button key={tab.id} onClick={() => setView(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${view === tab.id ? 'border-forest-800 text-forest-950' : 'border-transparent text-gray-500 hover:text-forest-800'}`}><tab.icon size={16} />{tab.label}</button>)}
      </div>

      {view === 'resumen' && <Summary statusCounts={statusCounts} chartData={chartData} total={filteredCards.length} />}
      {view === 'kanban' && <Kanban cards={filteredCards} rules={rules} />}
      {view === 'cronograma' && <Timeline cards={selectedCards} executions={data.executions} rule={selectedRule} asOf={fromIsoDate(asOf)} onLaborChange={setLaborCode} rules={rules} />}
      {view === 'historial' && <HistoryTable executions={data.executions} rules={rules} zonesByLot={new Map((catalogs.locations || []).map((item: any) => [item.name?.replace(/\s+/g, '').toUpperCase(), item.zone || 'Sin zona']))} />}
    </div>
  );
}

function Summary({ statusCounts, chartData, total }: { statusCounts: Record<CycleStatus, number>; chartData: any[]; total: number }) {
  const cards = [
    { key: 'AL_DIA' as const, icon: CheckCircle2 },
    { key: 'ALERTA' as const, icon: Clock3 },
    { key: 'CRITICO' as const, icon: AlertTriangle },
    { key: 'SIN_DATOS' as const, icon: ListFilter },
  ];
  return <div className="space-y-5"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{cards.map(({ key, icon: Icon }) => <Card key={key} className={`${STATUS_META[key].card} shadow-sm`}><CardContent className="p-4"><Icon size={19} className={key === 'CRITICO' ? 'text-red-600' : key === 'ALERTA' ? 'text-amber-600' : 'text-forest-700'} /><p className="mt-2 text-2xl font-black text-forest-950">{statusCounts[key]}</p><p className="text-xs font-bold uppercase tracking-wide text-gray-600">{STATUS_META[key].label}</p></CardContent></Card>)}</div><Card><CardHeader className="pb-2"><CardTitle className="text-base text-forest-950">Estado de ciclos por labor</CardTitle><p className="text-xs text-gray-500">{total} combinaciones lote–labor para la fecha de corte.</p></CardHeader><CardContent><div className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="labor" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="Al día" stackId="state" fill="#22c55e" radius={[0, 0, 3, 3]} /><Bar dataKey="Alerta" stackId="state" fill="#f59e0b" /><Bar dataKey="Crítico" stackId="state" fill="#dc2626" /><Bar dataKey="Sin datos" stackId="state" fill="#94a3b8" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card></div>;
}

function Kanban({ cards, rules }: { cards: CycleCard[]; rules: CycleLaborRule[] }) {
  const columns: CycleStatus[] = ['AL_DIA', 'ALERTA', 'CRITICO', 'SIN_DATOS'];
  const [laborCode, setLaborCode] = useState('TODAS');
  const filteredCards = laborCode === 'TODAS' ? cards : cards.filter((card) => card.labor.id === laborCode);
  return <div className="space-y-4"><Card className="border-forest-100"><CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-sm text-forest-950">Lotes para intervenir</p><p className="text-xs text-gray-500 mt-0.5">Filtra una labor para enfocar la jornada. Los lotes sin datos se conservan separados y no se consideran críticos.</p></div><label className="text-xs font-bold text-gray-600 flex items-center gap-2">Labor<select value={laborCode} onChange={(event) => setLaborCode(event.target.value)} className="h-9 min-w-48 rounded-lg border border-gray-300 px-3 text-sm font-medium text-forest-950 bg-white"><option value="TODAS">Todas las labores</option>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label></CardContent></Card><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{columns.map((state) => { const cardsInState = filteredCards.filter((card) => card.state === state); return <div key={state} className={`rounded-xl border p-3 ${STATUS_META[state].card}`}><div className="flex items-center justify-between mb-3"><span className="font-bold text-sm text-forest-950">{STATUS_META[state].label}</span><span className="text-xs font-black rounded-full bg-white px-2 py-0.5 border border-gray-200">{cardsInState.length}</span></div><div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">{cardsInState.map((card) => <CycleCardItem key={card.key} card={card} />)}{!cardsInState.length && <p className="text-xs text-gray-500 p-3 text-center">Sin lotes en este estado.</p>}</div></div>; })}</div></div>;
}

function CycleCardItem({ card }: { card: CycleCard; key?: React.Key }) {
  const age = cycleAgeValue(card.daysElapsed, card.labor.scheduleGranularity);
  return <div className="rounded-lg border border-white bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-2"><div><p className="font-black text-sm text-forest-950">{card.loteCode}</p><p className="text-[11px] font-medium text-gray-500">{card.zone}</p></div><span className={`text-[10px] px-2 py-0.5 rounded-full border font-black ${stateClass(card.state)}`}>{card.labor.name}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><p className="text-gray-400">Última ejecución</p><p className="font-semibold text-gray-700">{formatDate(card.lastExecution?.executionDate)}</p></div><div><p className="text-gray-400">Transcurrido</p><p className="font-semibold text-gray-700">{age === null ? '—' : `${age} ${card.labor.scheduleGranularity === 'DIA' ? 'días' : 'sem.'}`}</p></div></div>{card.personnelCount !== null && <p className="mt-2 text-[11px] text-gray-500">{numberFormatter.format(card.personnelCount)} personas en la última ejecución</p>}</div>;
}

function Timeline({ cards, executions, rule, asOf, onLaborChange, rules }: { cards: CycleCard[]; executions: CycleExecution[]; rule: CycleLaborRule; asOf: Date; onLaborChange: (value: string) => void; rules: CycleLaborRule[] }) {
  const monthDays = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0).getDate();
  const columns = rule.scheduleGranularity === 'DIA'
    ? Array.from({ length: monthDays }, (_, index) => new Date(asOf.getFullYear(), asOf.getMonth(), index + 1, 12))
    : Array.from({ length: 52 }, (_, index) => new Date(asOf.getFullYear(), 0, 1 + index * 7, 12));
  const formattedMonth = asOf.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentColumnIndex = columns.findIndex((date) => {
    if (rule.scheduleGranularity === 'DIA') return toIsoDate(date) === todayIso;
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return todayIso >= toIsoDate(date) && todayIso <= toIsoDate(end);
  });
  const currentWeekStart = currentColumnIndex >= 0 ? columns[currentColumnIndex] : null;
  const currentWeekEnd = currentWeekStart ? new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6, 12) : null;
  const currentWeek = currentColumnIndex + 1;
  const currentPeriodLabel = rule.scheduleGranularity === 'DIA'
    ? today.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    : currentWeekStart && currentWeekEnd
      ? `${currentWeekStart.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} al ${currentWeekEnd.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`
      : null;
  return <Card><CardHeader className="gap-3 pb-3 md:flex-row md:items-start md:justify-between"><div><CardTitle className="text-base text-forest-950">Cronograma de {rule.name}</CardTitle><p className="text-xs text-gray-500 mt-1">{rule.scheduleGranularity === 'DIA' ? `Vista diaria de ${formattedMonth}` : `Vista semanal del año ${asOf.getFullYear()}`}. El cero indica una ejecución registrada.</p></div><div className="flex flex-col sm:flex-row gap-2"><select value={rule.id} onChange={(event) => onLaborChange(event.target.value)} className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-forest-950 bg-white">{rules.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{rule.scheduleGranularity === 'SEMANA' && <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 min-w-44"><p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Semana actual</p><p className="text-sm font-black text-sky-950">{currentWeekStart ? `Semana ${currentWeek} de 52` : 'Fuera del año mostrado'}</p>{currentPeriodLabel && <p className="text-[11px] text-sky-800 mt-0.5">{currentPeriodLabel}</p>}</div>}</div></CardHeader><CardContent><div className="overflow-auto border rounded-xl"><table className="min-w-max w-full text-xs border-collapse"><thead className="bg-gray-50 sticky top-0 z-10"><tr className="h-2"><th colSpan={2} className="sticky left-0 z-20 bg-gray-50 border-b" />{columns.map((date, index) => <th key={`marker-${date.toISOString()}`} className={`border-b ${index === currentColumnIndex ? 'bg-sky-500' : 'bg-gray-50'}`} aria-label={index === currentColumnIndex ? `Marcador de ${rule.scheduleGranularity === 'DIA' ? 'hoy' : 'la semana actual'}` : undefined} />)}<th colSpan={2} className="bg-gray-50 border-b" /></tr><tr><th className="sticky left-0 z-20 bg-gray-50 text-left px-3 py-3 border-b min-w-28">Lote</th><th className="sticky left-28 z-20 bg-gray-50 text-left px-3 py-3 border-b min-w-28">Zona</th>{columns.map((date, index) => <th key={date.toISOString()} className={`px-1 py-3 border-b text-center text-[10px] font-bold min-w-8 ${index === currentColumnIndex ? 'bg-sky-50 text-sky-800 border-x-2 border-sky-300' : 'text-gray-500'}`} title={formatDate(toIsoDate(date))}>{index === currentColumnIndex ? <span className="inline-flex rounded bg-sky-600 px-1 text-white">{rule.scheduleGranularity === 'DIA' ? 'HOY' : 'ACTUAL'}</span> : index + 1}</th>)}<th className="px-3 py-3 border-b text-left min-w-28">Última ejecución</th><th className="px-3 py-3 border-b text-left min-w-24">Estado</th></tr></thead><tbody>{cards.map((card) => <tr key={card.key} className="border-b border-gray-100 hover:bg-gray-50"><td className="sticky left-0 z-10 bg-white px-3 py-2 font-bold text-forest-950">{card.loteCode}</td><td className="sticky left-28 z-10 bg-white px-3 py-2 text-gray-500">{card.zone}</td>{columns.map((date, index) => { const value = cycleValueAtDate(executions, card.loteCode, rule.id, date, rule); const cellState = getCycleState(value === null ? null : rule.scheduleGranularity === 'DIA' ? value : value * 7, rule); const hasExecution = value === 0; return <td key={date.toISOString()} className={`p-0.5 text-center ${index === currentColumnIndex ? 'bg-sky-50/70 border-x-2 border-sky-200' : ''}`}><span className={`block rounded py-1 text-[10px] font-bold ${hasExecution ? 'bg-forest-700 text-white' : value === null ? 'text-gray-300' : cellState === 'AL_DIA' ? 'bg-emerald-100 text-emerald-800' : cellState === 'ALERTA' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800'}`}>{value ?? '—'}</span></td>; })}<td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(card.lastExecution?.executionDate)}</td><td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${stateClass(card.state)}`}>{cycleStateLabel(card.state)}</span></td></tr>)}{cards.length === 0 && <tr><td colSpan={columns.length + 4} className="p-12 text-center text-gray-500">No hay lotes para el filtro seleccionado.</td></tr>}</tbody></table></div></CardContent></Card>;
}

function HistoryTable({ executions, rules, zonesByLot }: { executions: CycleExecution[]; rules: CycleLaborRule[]; zonesByLot: Map<string, string> }) {
  const ruleNames = new Map(rules.map((rule) => [rule.id, rule.name]));
  return <Card><CardHeader className="pb-2"><CardTitle className="text-base text-forest-950">Historial de ejecuciones importadas</CardTitle><p className="text-xs text-gray-500">Cada fila proviene de la hoja Ciclos cargada por el administrador.</p></CardHeader><CardContent><div className="overflow-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="text-left p-3">Fecha</th><th className="text-left p-3">Zona</th><th className="text-left p-3">Lote</th><th className="text-left p-3">Labor</th><th className="text-right p-3">Personas</th></tr></thead><tbody>{executions.slice(0, 300).map((execution) => <tr key={execution.id} className="border-t border-gray-100"><td className="p-3 text-gray-700">{formatDate(execution.executionDate)}</td><td className="p-3 text-gray-500">{zonesByLot.get(execution.loteCode) || 'Sin zona'}</td><td className="p-3 font-bold text-forest-950">{execution.loteCode}</td><td className="p-3">{ruleNames.get(execution.laborCode) || execution.laborCode}</td><td className="p-3 text-right font-mono">{numberFormatter.format(execution.personnelCount)}</td></tr>)}{executions.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-500">Aún no hay ejecuciones importadas.</td></tr>}</tbody></table></div>{executions.length > 300 && <p className="text-xs text-gray-500 mt-3">Mostrando los 300 registros más recientes.</p>}</CardContent></Card>;
}
