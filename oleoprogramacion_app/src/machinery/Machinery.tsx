import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Tractor, Calendar, MapPin, Check, Pencil, Trash2, AlertCircle, UserRound } from 'lucide-react';

export default function Machinery() {
  const { user } = useAuth();
  const { catalogs, loading: catLoading } = useCatalogs();

  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [equipmentId, setEquipmentId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [laborId, setLaborId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [observations, setObservations] = useState('');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [todaysMachinery, setTodaysMachinery] = useState<any[]>([]);

  // Estados para Modal de Edición
  const [editingOp, setEditingOp] = useState<any | null>(null);
  const [editEquipmentId, setEditEquipmentId] = useState('');
  const [editOperatorId, setEditOperatorId] = useState('');
  const [editLaborId, setEditLaborId] = useState('');
  const [editActivityId, setEditActivityId] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [editSelectedZones, setEditSelectedZones] = useState<string[]>([]);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Estado para el modal de eliminación
  const [deletingOpId, setDeletingOpId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isDirectivo = user?.role === 'DIRECTIVO';

  // Suscribirse a TODAS las operaciones de la fecha sin filtrar por supervisor
  useEffect(() => {
    const filters: any = { date };
    const unsub = repository.subscribeMachinery(filters, (items) => {
      setTodaysMachinery(items);
    });
    return () => unsub();
  }, [date]);

  const tractors = (catalogs.equipment || []).filter((e: any) => e.active);
  const machineryLabor = useMemo(
    () => (catalogs.labors || []).find((l: any) => String(l.name || '').trim().toUpperCase() === 'MAQUINARIA'),
    [catalogs.labors]
  );
  const operatorOptions = (catalogs.personnel || []).filter((p: any) => {
    if (!p.active) return false;
    const tractorRole = [p.jobTitle, p.job_title, p.cuadrilla, p.laborCargo, p.labor_cargo]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();
    return tractorRole.includes('TRACTOR');
  });

  useEffect(() => {
    if (machineryLabor?.id) setLaborId(machineryLabor.id);
  }, [machineryLabor?.id]);

  const effectiveLaborForActivities = machineryLabor?.id || editLaborId || laborId;
  const activities = (catalogs.activities || []).filter((a: any) => 
    a.active && (!effectiveLaborForActivities || a.laborId === effectiveLaborForActivities)
  );

  const rawZones: string[] = Array.from(new Set<string>(
    (catalogs.locations || [])
      .map((loc: any) => loc.zone)
      .filter((z: any): z is string => typeof z === 'string' && z.trim().length > 0)
  ));
  if (!rawZones.some(z => z.toUpperCase().trim() === 'ALMACEN')) {
    rawZones.push('ALMACEN');
  }
  if (!rawZones.some(z => z.toUpperCase().trim() === 'LA DILIA')) {
    rawZones.push('LA DILIA');
  }
  const zones: string[] = rawZones.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  const toggleZone = (z: string) => {
    setSelectedZones(prev => 
      prev.includes(z) ? prev.filter(item => item !== z) : [...prev, z]
    );
  };

  const selectAllZones = () => {
    setSelectedZones([...zones]);
  };

  const clearZones = () => {
    setSelectedZones([]);
  };

  const toggleEditZone = (z: string) => {
    setEditSelectedZones(prev => 
      prev.includes(z) ? prev.filter(item => item !== z) : [...prev, z]
    );
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !equipmentId || !operatorId || !machineryLabor?.id || !activityId || selectedZones.length === 0) {
      setError('Seleccione fecha, equipo, tractorista, actividad y al menos una zona antes de registrar.');
      return;
    }
    setError('');
    setLoading(true);

    const opObj = catalogs.personnel?.find((p: any) => p.id === operatorId);
    const opName = opObj?.name || opObj?.nombreCompleto || '';

    const payload = {
      date,
      equipmentId,
      operatorId,
      operatorName: opName,
      laborId: machineryLabor.id,
      activityId,
      observations: observations || '',
      locationId: null,
      zoneSnapshot: selectedZones.join(', '),
      idSupervisor: user?.idSupervisor || 'SUP001',
      supervisorId: user?.idSupervisor || 'SUP001',
      createdBy: user?.id || null,
    };

    const res = await repository.createMachineryOperation(payload);
    setLoading(false);
    if (res.ok) {
      setEquipmentId('');
      setOperatorId('');
      setLaborId(machineryLabor.id);
      setActivityId('');
      setObservations('');
      setSelectedZones([]);
    } else {
      setError(res.error || 'Error al guardar');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingOpId) return;
    setActionLoading(true);
    const res = await repository.deleteMachineryOperation(deletingOpId);
    setActionLoading(false);
    if (res.ok) {
      setDeletingOpId(null);
    } else {
      alert(res.error || 'Error al eliminar');
    }
  };

  const openEdit = (op: any) => {
    setEditingOp(op);
    setEditEquipmentId(op.equipmentId || op.equipment_id || '');
    setEditOperatorId(op.operatorId || op.operator_id || '');
    setEditLaborId(machineryLabor?.id || op.laborId || op.labor_id || '');
    setEditActivityId(op.activityId || op.activity_id || '');
    setEditObservations(op.observations || '');

    // Parse zones from zoneSnapshot
    const currentZones = (op.zoneSnapshot || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    setEditSelectedZones(currentZones);
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEquipmentId || !editOperatorId || !machineryLabor?.id || !editActivityId || editSelectedZones.length === 0) {
      setEditError('Seleccione equipo, tractorista, actividad y al menos una zona antes de guardar.');
      return;
    }
    setEditError('');
    setEditLoading(true);

    const opObj = catalogs.personnel?.find((p: any) => p.id === editOperatorId);
    const opName = opObj?.name || opObj?.nombreCompleto || '';

    const updatePayload: any = {
      equipmentId: editEquipmentId,
      operatorId: editOperatorId,
      operatorName: opName,
      laborId: machineryLabor.id,
      activityId: editActivityId,
      zoneSnapshot: editSelectedZones.join(', '),
      observations: editObservations || '',
    };

    const res = await repository.updateMachineryOperation(editingOp.id, updatePayload, editingOp.version);
    setEditLoading(false);

    if (res.ok) {
      setEditingOp(null);
    } else {
      setEditError(res.error || 'Error al actualizar operación');
    }
  };

  if (catLoading) return <div className="p-6 text-gray-500">Cargando catálogo...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Tractor className="w-6 h-6 text-forest-700" /> Maquinaria
          </h2>
          <p className="text-gray-500 text-sm mt-1">Control y seguimiento de operaciones mecanizadas por zonas</p>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs self-start sm:self-auto">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-xs font-semibold text-gray-600">Fecha:</span>
          <Input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="border-0 h-8 text-sm font-bold text-primary focus-visible:ring-0 p-0 w-36" 
          />
        </div>
      </div>

      <div className={cn("grid gap-6", isDirectivo ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
        {/* Formulario solo para NO Directivos */}
        {!isDirectivo && (
          <Card className="lg:col-span-1 h-fit shadow-md border-forest-900/10">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 to-transparent">
              <CardTitle className="text-base font-bold text-forest-950 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Tractor size={20} className="text-purple-700" /> Nueva Operación
                </span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                  3 Pasos
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Banner de Contexto en Vivo */}
              {(() => {
                const currentEq = tractors.find((t: any) => t.id === equipmentId);
                const currentOp = operatorOptions.find((p: any) => p.id === operatorId);
                const currentLabor = machineryLabor;
                const currentAct = activities.find((a: any) => a.id === activityId);
                return (
                  <div className="bg-gradient-to-r from-purple-800 to-indigo-950 text-white p-3 rounded-xl shadow-xs mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                        <Tractor size={18} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase tracking-wider text-purple-200 font-bold block">
                          📌 Estás Programando:
                        </span>
                        <span className="text-sm font-extrabold text-white truncate block">
                          {currentEq?.code ? `${currentEq.code} - ${currentEq.name}` : (currentEq?.name || 'Seleccione Equipo...')}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-100 mt-0.5 flex-wrap">
                          <span>👤 <strong>{currentOp?.name || 'Sin Operador'}</strong></span>
                          <span>•</span>
                          <span>🌿 <strong>{currentAct?.name || currentLabor?.name || 'Labor'}</strong></span>
                          <span>•</span>
                          <span>📍 <strong>{selectedZones.length} Zonas</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <form onSubmit={handleStart} className="space-y-4">
                {error && <div className="text-sm text-negative bg-negative/10 p-2.5 rounded-md">{error}</div>}
                
                {/* 1️⃣ PASO 1: Fecha */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-blue-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-black">1</span>
                      FECHA DE LA OPERACIÓN *
                    </Label>
                    {date && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                        <Check size={11} className="text-emerald-700 stroke-[3]" /> LISTO
                      </span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-blue-950 font-black uppercase tracking-wide">FECHA *</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-white font-bold text-sm h-10 border-blue-300" />
                  </div>
                </div>

                {/* 2️⃣ PASO 2: Equipo y Tractorista */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-2 transition-all",
                  equipmentId && operatorId ? "bg-purple-50/60 border-purple-200/80" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-purple-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white inline-flex items-center justify-center text-xs font-black">2</span>
                      TRACTOR Y OPERADOR *
                    </Label>
                    {equipmentId && operatorId ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                        <Check size={11} className="text-emerald-700 stroke-[3]" /> LISTO
                      </span>
                    ) : (
                      <span className="text-[10px] text-purple-700 font-bold italic uppercase">PENDIENTE</span>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] text-purple-950 font-black uppercase tracking-wide">TRACTOR / EQUIPO *</Label>
                    <Combobox
                      options={tractors.map((t: any) => ({
                        value: t.id,
                        label: t.code ? `${t.code} - ${t.name}` : t.name
                      }))}
                      value={equipmentId} 
                      onChange={setEquipmentId} 
                      placeholder="SELECCIONE TRACTOR..."
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-purple-950 font-black uppercase tracking-wide">OPERADOR (TRACTORISTA) *</Label>
                    <Combobox
                      options={operatorOptions.map((p: any) => ({
                        value: p.id,
                        label: p.name || p.nombreCompleto
                      }))}
                      value={operatorId} 
                      onChange={setOperatorId} 
                      placeholder="SELECCIONE OPERADOR..."
                    />
                  </div>
                </div>

                {/* 3️⃣ PASO 3: Labor, Actividad y Zonas */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-2 transition-all",
                  machineryLabor?.id && activityId && selectedZones.length > 0 ? "bg-emerald-50/60 border-emerald-200/80" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-emerald-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-xs font-black">3</span>
                      LABOR Y ZONAS DE OPERACIÓN *
                    </Label>
                    {machineryLabor?.id && activityId && selectedZones.length > 0 ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                        <Check size={11} className="text-emerald-700 stroke-[3]" /> LISTO
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-800 font-bold italic uppercase">PENDIENTE</span>
                    )}
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <Label className="text-[11px] text-emerald-950 font-black uppercase tracking-wide">LABOR</Label>
                    <p className="text-sm font-bold text-emerald-950 mt-0.5">{machineryLabor?.name || 'MAQUINARIA'}</p>
                  </div>

                  <div>
                    <Label className="text-[11px] text-emerald-950 font-black uppercase tracking-wide">ACTIVIDAD *</Label>
                    <Combobox
                      options={activities.map((a: any) => ({ value: a.id, label: a.name }))}
                      value={activityId}
                      onChange={setActivityId}
                      placeholder="SELECCIONE ACTIVIDAD DE MAQUINARIA..."
                    />
                  </div>

                  {/* Selector Múltiple de Zonas */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1 text-[11px] text-emerald-950 font-black uppercase tracking-wide">
                        <MapPin size={12} className="text-emerald-700" /> ZONAS DE TRABAJO ({selectedZones.length}) *
                      </Label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={selectAllZones}
                          className="text-emerald-800 hover:text-emerald-950 font-black uppercase tracking-wider underline cursor-pointer"
                        >
                          TODAS
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={clearZones}
                          className="text-gray-500 hover:text-red-700 uppercase tracking-wider underline font-bold cursor-pointer"
                        >
                          LIMPIAR
                        </button>
                      </div>
                    </div>

                    {/* Badges clicables de Zonas */}
                    <div className="border border-emerald-200 rounded-lg p-2 bg-white max-h-32 overflow-y-auto">
                      {zones.length === 0 ? (
                        <p className="text-xs text-gray-400 font-bold uppercase">No hay zonas configuradas</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {zones.map((z: string) => {
                            const isSelected = selectedZones.includes(z);
                            return (
                              <button
                                key={z}
                                type="button"
                                onClick={() => toggleZone(z)}
                                className={cn(
                                  "text-xs font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer uppercase",
                                  isSelected
                                    ? "bg-purple-900 text-white shadow-xs font-black"
                                    : "bg-gray-50 text-gray-700 border border-gray-200 hover:border-purple-600 hover:bg-purple-50/50"
                                )}
                              >
                                {isSelected ? (
                                  <Check size={12} className="text-lime-400 stroke-[3]" />
                                ) : (
                                  <MapPin size={12} className="text-gray-400" />
                                )}
                                <span>{z}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="machinery-obs" className="text-xs font-black text-gray-800 uppercase tracking-wide">OBSERVACIONES (OPCIONAL)</Label>
                  <Input
                    id="machinery-obs"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Notas u observaciones de la operación..."
                    className="bg-white font-medium"
                  />
                </div>

                <div className="pt-2 pb-6">
                  <Button
                    type="submit"
                    disabled={loading || !date || !equipmentId || !operatorId || !machineryLabor?.id || !activityId || selectedZones.length === 0}
                    className="w-full min-h-[50px] h-auto py-3 px-4 shadow-xl font-black text-xs sm:text-sm uppercase tracking-wide text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer text-center leading-snug whitespace-normal bg-purple-900 hover:bg-purple-950"
                  >
                    <Check size={18} className="shrink-0" />
                    <span>{loading ? 'GUARDANDO...' : 'REGISTRAR OPERACIÓN MECANIZADA'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Listado de Operaciones */}
        <Card className={cn(isDirectivo ? "col-span-1" : "lg:col-span-2", "shadow-xs border-forest-900/10")}>
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-800">Operaciones del {date}</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">{todaysMachinery.length} operación{todaysMachinery.length === 1 ? '' : 'es'} registrada{todaysMachinery.length === 1 ? '' : 's'}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {todaysMachinery.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <Tractor size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="font-medium text-sm">No hay operaciones registradas en esta fecha.</p>
                <p className="text-xs text-gray-400 mt-1">Los registros de maquinaria de esta fecha aparecerán listados aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysMachinery.map(m => {
                  const eq = catalogs.equipment?.find((e: any) => e.id === m.equipmentId);
                  const op = catalogs.personnel?.find((p: any) => p.id === m.operatorId);
                  const labor = catalogs.labors?.find((l: any) => l.id === (m.laborId || m.labor_id));
                  const act = catalogs.activities?.find((a: any) => a.id === (m.activityId || m.activity_id));
                  const registeredBy = catalogs.users?.find((u: any) =>
                    u.id === m.createdBy ||
                    u.id === m.created_by ||
                    u.idSupervisor === m.supervisorId ||
                    u.supervisorId === m.supervisorId
                  );
                  const registeredByName = registeredBy?.name || m.supervisorName || m.supervisorId || 'No disponible';

                  return (
                    <div key={m.id} className="border border-forest-900/15 rounded-xl p-4 bg-white shadow-xs hover:border-forest-900/30 transition-all space-y-3">
                      {/* Header de la operación */}
                      <div className="flex items-start gap-3 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-forest-50 text-forest-800 rounded-lg shrink-0">
                            <Tractor size={20} className="text-forest-700" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 text-base leading-tight truncate">
                              {eq?.code ? `${eq.code} - ${eq.name}` : (eq?.name || 'Equipo')}
                            </h4>
                            <p className="text-xs text-gray-600 font-medium mt-0.5">
                              Operador: <span className="text-gray-900 font-semibold">{op?.name || m.operatorName || 'Sin asignar'}</span>
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Detalles: Labor y Zonas */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-forest-900 bg-forest-50/60 px-2.5 py-1.5 rounded-lg border border-forest-100">
                          <span className="font-semibold text-gray-600">Labor:</span>
                          <span className="font-bold text-forest-950 truncate">{labor?.name || 'Maquinaria'}</span>
                          {act?.name && <span className="text-gray-600 font-medium truncate">— {act.name}</span>}
                        </div>

                        <div className="flex items-center gap-1.5 text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200/70">
                          <MapPin size={13} className="text-forest-700 shrink-0" />
                          <span className="font-semibold text-gray-600">Zonas:</span>
                          <span className="font-bold text-gray-900 truncate">{m.zoneSnapshot || 'No especificada'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200/70">
                          <UserRound size={13} className="text-forest-700 shrink-0" />
                          <span className="font-semibold text-gray-600">Registró:</span>
                          <span className="font-bold text-gray-900 truncate">{registeredByName}</span>
                        </div>
                      </div>

                      {/* Observaciones si existen */}
                      {m.observations && (
                        <div className="text-xs text-gray-600 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-200/60">
                          <strong className="text-gray-700">Obs:</strong> {m.observations}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        {/* Botones de Acción */}
                        {!isDirectivo && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-gray-700 border-gray-300 hover:bg-gray-100 text-xs h-7 px-2.5 font-medium flex items-center gap-1 cursor-pointer"
                              onClick={() => openEdit(m)}
                              title="Editar operación"
                            >
                              <Pencil size={12} /> Editar
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7 w-7 p-0 flex items-center justify-center cursor-pointer"
                              onClick={() => setDeletingOpId(m.id)}
                              title="Eliminar operación"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edición */}
      <Dialog open={!!editingOp} onOpenChange={(open) => !open && setEditingOp(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-forest-950">
              <Pencil size={18} className="text-forest-700" /> Editar Operación de Maquinaria
            </DialogTitle>
          </DialogHeader>

          {editingOp && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              {editError && (
                <div className="text-sm text-negative bg-negative/10 p-2.5 rounded-md flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <Label>Tractor / Equipo *</Label>
                <Combobox
                  options={tractors.map((t: any) => ({
                    value: t.id,
                    label: t.code ? `${t.code} - ${t.name}` : t.name
                  }))}
                  value={editEquipmentId}
                  onChange={setEditEquipmentId}
                  placeholder="Seleccione tractor..."
                />
              </div>

              <div>
                <Label>Operador (Tractorista) *</Label>
                <Combobox
                  options={operatorOptions.map((p: any) => ({
                    value: p.id,
                    label: p.name || p.nombreCompleto
                  }))}
                  value={editOperatorId}
                  onChange={setEditOperatorId}
                  placeholder="Seleccione operador..."
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <Label>Labor</Label>
                <p className="text-sm font-bold text-forest-950 mt-0.5">{machineryLabor?.name || 'MAQUINARIA'}</p>
              </div>

              <div>
                <Label>Actividad *</Label>
                <Combobox
                  options={(catalogs.activities || [])
                    .filter((a: any) => a.active && a.laborId === machineryLabor?.id)
                    .map((a: any) => ({ value: a.id, label: a.name }))}
                  value={editActivityId}
                  onChange={setEditActivityId}
                  placeholder="Seleccione actividad..."
                />
              </div>

              {/* Selector Múltiple de Zonas en Edición */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs">
                  <MapPin size={13} className="text-forest-700" /> Zonas de Operación *
                </Label>
                <div className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/50 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {zones.map((z: string) => {
                      const isSelected = editSelectedZones.includes(z);
                      return (
                        <button
                          key={z}
                          type="button"
                          onClick={() => toggleEditZone(z)}
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-md transition-all flex items-center gap-1",
                            isSelected
                              ? "bg-forest-900 text-white shadow-xs"
                              : "bg-white text-gray-700 border border-gray-200 hover:border-forest-700 hover:bg-forest-50/50"
                          )}
                        >
                          {isSelected ? (
                            <Check size={12} className="text-lime-400 stroke-[3]" />
                          ) : (
                            <MapPin size={12} className="text-gray-400" />
                          )}
                          <span>{z}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-obs">Observaciones</Label>
                <Input
                  id="edit-obs"
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  placeholder="Detalles de la operación..."
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingOp(null)}
                  disabled={editLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading}
                  className="bg-forest-900 hover:bg-forest-950 text-white font-bold"
                >
                  {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal In-App para Eliminar Operación */}
      <Dialog open={!!deletingOpId} onOpenChange={(open) => !open && setDeletingOpId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 font-bold">
              <Trash2 size={18} /> Eliminar Operación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-700">
              ¿Está seguro de depurar permanentemente este registro de maquinaria? Esta acción no se puede deshacer.
            </p>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeletingOpId(null)} disabled={actionLoading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmDelete} 
                disabled={actionLoading}
                className="bg-red-700 hover:bg-red-800 text-white font-bold cursor-pointer"
              >
                {actionLoading ? 'Eliminando...' : 'Eliminar Registro'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
