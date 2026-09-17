import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileSpreadsheet, Loader2, PencilLine, Plus, TrendingUp, Upload, X } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label } from '@/src/components/ui';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { parseProductivityFile } from '../shared/spreadsheetImport';
import { normalizeLotCode } from '../cycles/cycleLogic';
import type { ProductivityImport, ProductivityRecord } from '../types';

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

function currentPeriod() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7);
}

function toNumberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function Productivity() {
  const { user } = useAuth();
  const { catalogs } = useCatalogs();
  const [records, setRecords] = useState<ProductivityRecord[]>([]);
  const [imports, setImports] = useState<ProductivityImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(currentPeriod());
  const [zone, setZone] = useState('TODAS');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof parseProductivityFile>> & { file: File } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ period: currentPeriod(), loteCode: '', racimos: '', kilograms: '', tons: '', averageWeight: '' });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = repository.subscribeProductivity((next) => {
      setRecords(next.records);
      setImports(next.imports);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const zones = useMemo(() => Array.from(new Set((catalogs.locations || []).map((location: any) => location.zone).filter(Boolean))).sort(), [catalogs.locations]);
  const locationsByCode = useMemo(() => new Map((catalogs.locations || []).map((location: any) => [normalizeLotCode(location.name), location])), [catalogs.locations]);
  const visibleRecords = useMemo(() => records.filter((record) => record.period === period && (zone === 'TODAS' || record.zonaSnapshot === zone || locationsByCode.get(record.loteCode)?.zone === zone)), [records, period, zone, locationsByCode]);
  const totalTons = visibleRecords.reduce((sum, record) => sum + (record.tons ?? (record.kilograms ? record.kilograms / 1000 : 0)), 0);
  const totalRacimos = visibleRecords.reduce((sum, record) => sum + (record.racimos || 0), 0);
  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();
    visibleRecords.forEach((record) => {
      const recordZone = record.zonaSnapshot || locationsByCode.get(record.loteCode)?.zone || 'Sin zona';
      grouped.set(recordZone, (grouped.get(recordZone) || 0) + (record.tons ?? (record.kilograms ? record.kilograms / 1000 : 0)));
    });
    return Array.from(grouped.entries()).map(([name, toneladas]) => ({ name, toneladas })).sort((a, b) => b.toneladas - a.toneladas);
  }, [visibleRecords, locationsByCode]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setNotice(null);
    try {
      const parsed = await parseProductivityFile(file);
      setPreview({ ...parsed, file });
    } catch {
      setNotice('No se pudo leer el archivo. Revisa la plantilla mensual de productividad.');
    }
  };

  const confirmImport = async () => {
    if (!preview || !user) return;
    setImporting(true);
    const result = await repository.importProductivityRecords({
      fileName: preview.file.name,
      fileType: preview.file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'XLSX',
      importedBy: user.id,
      rows: preview.rows,
      errors: preview.errors,
    });
    setImporting(false);
    if (result.ok) {
      setNotice(`Importación completada: ${preview.rows.length} registro(s) mensual(es).`);
      setPreview(null);
    } else {
      setNotice(result.error || 'No fue posible guardar la importación. Verifica que la migración esté aplicada.');
    }
  };

  const saveManual = async (event: React.FormEvent) => {
    event.preventDefault();
    const loteCode = normalizeLotCode(manual.loteCode);
    const location = locationsByCode.get(loteCode);
    if (!loteCode) return;
    if (![manual.racimos, manual.kilograms, manual.tons, manual.averageWeight].some((value) => value.trim() !== '')) {
      setNotice('Registra al menos un indicador de productividad antes de guardar.');
      return;
    }
    setSaving(true);
    const result = await repository.saveProductivityRecord({
      period: manual.period,
      loteCode,
      zonaSnapshot: location?.zone || null,
      siembraSnapshot: location?.anoSiembra ?? null,
      racimos: toNumberOrNull(manual.racimos),
      kilograms: toNumberOrNull(manual.kilograms),
      tons: toNumberOrNull(manual.tons),
      averageWeight: toNumberOrNull(manual.averageWeight),
    });
    setSaving(false);
    if (result.ok) {
      setNotice(`Productividad de ${loteCode} guardada.`);
      setManualOpen(false);
      setManual({ period: currentPeriod(), loteCode: '', racimos: '', kilograms: '', tons: '', averageWeight: '' });
    } else setNotice(result.error || 'No fue posible guardar el registro.');
  };

  if (loading) return <div className="min-h-[360px] flex flex-col items-center justify-center gap-3 text-forest-800"><Loader2 className="animate-spin" size={32} /><p className="text-sm font-medium">Cargando productividad…</p></div>;

  return <div className="space-y-5"><Card className="border-lime-300 bg-gradient-to-r from-lime-100 via-lime-50 to-white shadow-sm"><CardContent className="p-5 md:p-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-forest-800 text-xs font-extrabold uppercase tracking-wider"><TrendingUp size={15} /> Indicadores mensuales</div><h2 className="text-2xl font-bold mt-1 text-forest-950">Productividad</h2><p className="text-sm text-gray-600 mt-1">Registros mensuales por lote, independientes del control de ciclos.</p></div><div className="flex flex-col sm:flex-row gap-2"><label className="text-xs font-semibold text-gray-600 flex flex-col gap-1">Periodo<Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 bg-white" /></label><label className="text-xs font-semibold text-gray-600 flex flex-col gap-1">Zona<select value={zone} onChange={(event) => setZone(event.target.value)} className="h-9 rounded-lg border border-gray-300 px-3 bg-white text-sm"><option value="TODAS">Todas las zonas</option>{zones.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{user?.role === 'ADMIN' && <><Button onClick={() => setManualOpen(true)} variant="outline" className="self-end"><Plus size={16} className="mr-2" />Registrar mes</Button><Button onClick={() => fileInputRef.current?.click()} className="self-end"><Upload size={16} className="mr-2" />Importar</Button><input ref={fileInputRef} className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} /></>}</div></CardContent></Card>
    {notice && <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Cerrar aviso"><X size={16} /></button></div>}
    {preview && <Card className="border-blue-200 bg-blue-50/50"><CardContent className="p-4 md:p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold text-forest-950 flex items-center gap-2"><FileSpreadsheet size={18} className="text-blue-600" />Vista previa: {preview.file.name}</p><p className="text-sm text-gray-600 mt-1">{preview.rows.length} válidos de {preview.sourceRows} filas. {preview.errors.length} observación(es) no se importarán.</p>{preview.errors.length > 0 && <p className="text-xs text-red-700 mt-1">{preview.errors.slice(0, 2).join(' · ')}</p>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button><Button disabled={!preview.rows.length || importing} onClick={confirmImport}>{importing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload className="mr-2" size={16} />}Confirmar carga</Button></div></CardContent></Card>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Metric label="Toneladas registradas" value={numberFormatter.format(totalTons)} suffix="t" /><Metric label="Racimos registrados" value={numberFormatter.format(totalRacimos)} suffix="rac." /><Metric label="Lotes con registro" value={String(visibleRecords.length)} suffix="lotes" /></div>
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5"><Card className="xl:col-span-3"><CardHeader className="pb-2"><CardTitle className="text-base text-forest-950">Toneladas por zona</CardTitle></CardHeader><CardContent><div className="h-[290px]">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="toneladas" name="Toneladas" fill="#315D43" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty message="Importa o registra la productividad mensual para ver el gráfico." />}</div></CardContent></Card><Card className="xl:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-base text-forest-950">Últimas cargas</CardTitle></CardHeader><CardContent><div className="space-y-2 max-h-[260px] overflow-y-auto">{imports.length ? imports.map((item) => <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3"><p className="font-bold text-xs text-forest-950 truncate">{item.fileName}</p><p className="text-[11px] text-gray-500 mt-1">{item.acceptedRows} registros · {new Date(item.importedAt).toLocaleDateString('es-CO')}</p></div>) : <Empty message="Aún no hay importaciones." />}</div></CardContent></Card></div>
    <Card><CardHeader className="pb-2"><CardTitle className="text-base text-forest-950">Detalle mensual</CardTitle></CardHeader><CardContent><div className="overflow-auto rounded-xl border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="text-left p-3">Lote</th><th className="text-left p-3">Zona</th><th className="text-right p-3">Racimos</th><th className="text-right p-3">Kilos</th><th className="text-right p-3">Toneladas</th><th className="text-right p-3">Peso promedio</th><th className="text-left p-3">Origen</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.id} className="border-t border-gray-100"><td className="p-3 font-bold text-forest-950">{record.loteCode}</td><td className="p-3 text-gray-500">{record.zonaSnapshot || locationsByCode.get(record.loteCode)?.zone || '—'}</td><td className="p-3 text-right font-mono">{record.racimos === null ? '—' : numberFormatter.format(record.racimos)}</td><td className="p-3 text-right font-mono">{record.kilograms === null ? '—' : numberFormatter.format(record.kilograms)}</td><td className="p-3 text-right font-mono">{record.tons === null ? (record.kilograms ? numberFormatter.format(record.kilograms / 1000) : '—') : numberFormatter.format(record.tons)}</td><td className="p-3 text-right font-mono">{record.averageWeight === null ? '—' : numberFormatter.format(record.averageWeight)}</td><td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black border ${record.source === 'MANUAL' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>{record.source === 'MANUAL' ? 'Manual' : 'Importación'}</span></td></tr>)}{!visibleRecords.length && <tr><td colSpan={7} className="p-12 text-center text-gray-500">No hay productividad registrada para este período.</td></tr>}</tbody></table></div></CardContent></Card>
    <Dialog open={manualOpen} onOpenChange={setManualOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Registrar productividad mensual</DialogTitle><DialogDescription>La zona y siembra se completan desde el lote cuando exista en el catálogo.</DialogDescription></DialogHeader><form onSubmit={saveManual} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"><Field label="Periodo"><Input type="month" required value={manual.period} onChange={(event) => setManual({ ...manual, period: event.target.value })} /></Field><Field label="Lote"><Input required placeholder="Ej. 09E007" value={manual.loteCode} onChange={(event) => setManual({ ...manual, loteCode: event.target.value })} /></Field><Field label="Racimos"><Input inputMode="decimal" value={manual.racimos} onChange={(event) => setManual({ ...manual, racimos: event.target.value })} /></Field><Field label="Kilogramos"><Input inputMode="decimal" value={manual.kilograms} onChange={(event) => setManual({ ...manual, kilograms: event.target.value })} /></Field><Field label="Toneladas"><Input inputMode="decimal" value={manual.tons} onChange={(event) => setManual({ ...manual, tons: event.target.value })} /></Field><Field label="Peso promedio"><Input inputMode="decimal" value={manual.averageWeight} onChange={(event) => setManual({ ...manual, averageWeight: event.target.value })} /></Field><div className="sm:col-span-2 flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setManualOpen(false)}>Cancelar</Button><Button disabled={saving} type="submit">{saving && <Loader2 className="mr-2 animate-spin" size={16} />}Guardar registro</Button></div></form></DialogContent></Dialog>
  </div>;
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix: string }) { return <Card className="shadow-sm"><CardContent className="p-4"><p className="text-2xl font-black text-forest-950">{value} <span className="text-sm text-gray-500">{suffix}</span></p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p></CardContent></Card>; }
function Empty({ message }: { message: string }) { return <div className="h-full flex items-center justify-center text-center text-sm text-gray-400 px-8">{message}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5"><Label>{label}</Label>{children}</label>; }
