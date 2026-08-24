import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Play, Square, Tractor, Calendar, MapPin, Check, Layers, Clock, Pencil, Trash2, X, AlertCircle } from 'lucide-react';

export function calculateDuration(startTime?: string, endTime?: string): string | null {
  if (!startTime || !endTime) return null;
  const partsStart = startTime.split(':').map(Number);
  const partsEnd = endTime.split(':').map(Number);
  if (partsStart.length < 2 || partsEnd.length < 2) return null;
  if (isNaN(partsStart[0]) || isNaN(partsStart[1]) || isNaN(partsEnd[0]) || isNaN(partsEnd[1])) return null;

  let startMins = partsStart[0] * 60 + partsStart[1];
  let endMins = partsEnd[0] * 60 + partsEnd[1];
  if (endMins < startMins) endMins += 24 * 60;

  const diffMins = endMins - startMins;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours === 0 && mins === 0) return '0 min';
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function Machinery() {
  const { user } = useAuth();
  const { catalogs, loading: catLoading } = useCatalogs();

  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [equipmentId, setEquipmentId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [laborId, setLaborId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [observations, setObservations] = useState('');
  const [startTime, setStartTime] = useState(() => 
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })
  );
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
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editStatus, setEditStatus] = useState('EN_PROGRESO');
  const [editObservations, setEditObservations] = useState('');
  const [editSelectedZones, setEditSelectedZones] = useState<string[]>([]);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const isDirectivo = user?.role === 'DIRECTIVO';

  useEffect(() => {
    const filters: any = { date };
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsub = repository.subscribeMachinery(filters, setTodaysMachinery);
    return () => unsub();
  }, [date, user]);

  const isTractorista = (person: any): boolean => {
    if (!person) return false;
    const cargo = (person.jobTitle || person.laborCargo || person.cargo || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cuadrilla = (person.cuadrilla || person.zona || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tipo = (person.tipoPersonal || person.tipo_personal || person.type || '').toUpperCase();
    
    return cargo.includes('TRACTOR') || 
           cargo.includes('OPERADOR') || 
           cargo.includes('MAQUINARIA') ||
           cuadrilla.includes('TRACTOR') || 
           cuadrilla.includes('OPERADOR') ||
           tipo.includes('TRACTOR');
  };

  const tractoristas = (catalogs.personnel || [])
    .filter((p: any) => p.active && isTractorista(p))
    .sort((a: any, b: any) => (a.name || a.nombreCompleto || '').localeCompare(b.name || b.nombreCompleto || '', 'es', { numeric: true }));

  const operatorOptions = tractoristas.length > 0
    ? tractoristas
    : (catalogs.personnel || []).filter((p: any) => p.active).sort((a: any, b: any) => (a.name || a.nombreCompleto || '').localeCompare(b.name || b.nombreCompleto || '', 'es', { numeric: true }));

  const tractors = (catalogs.equipment || [])
    .filter((e: any) => e.type === 'TRACTOR')
    .sort((a: any, b: any) => a.name.localeCompare(b.name, 'es', { numeric: true }));

  // Labor: Solo labor MAQUINARIA seleccionada por defecto
  const machineryLabor = (catalogs.labors || []).find((l: any) => 
    l.active && l.name.toUpperCase().trim() === 'MAQUINARIA'
  ) || (catalogs.labors || []).find((l: any) => 
    l.active && l.name.toUpperCase().includes('MAQUINARIA')
  );

  const labors = machineryLabor 
    ? [machineryLabor]
    : (catalogs.labors || []).filter((l: any) => l.active).sort((a: any, b: any) => a.name.localeCompare(b.name, 'es', { numeric: true }));

  // Auto-seleccionar por defecto la labor MAQUINARIA
  useEffect(() => {
    if (machineryLabor && (!laborId || laborId !== machineryLabor.id)) {
      setLaborId(machineryLabor.id);
    }
  }, [machineryLabor, laborId]);

  const activeLaborId = laborId || machineryLabor?.id;

  const allActivities = (catalogs.activities || [])
    .filter((a: any) => a.active)
    .sort((a: any, b: any) => a.name.localeCompare(b.name, 'es', { numeric: true }));

  // Actividades filtradas por la labor de maquinaria
  const activities = activeLaborId
    ? allActivities.filter((a: any) => a.laborId === activeLaborId)
    : allActivities;

  // Lista única de Zonas configuradas en el sistema
  const zones = Array.from(
    new Set(
      (catalogs.locations || [])
        .map((l: any) => (l.zone || '').trim())
        .filter(Boolean)
    )
  ).sort((a: any, b: any) => String(a).localeCompare(String(b), 'es', { numeric: true }));

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
    const effectiveLaborId = laborId || machineryLabor?.id;
    if (!equipmentId || !operatorId || !effectiveLaborId || selectedZones.length === 0 || !startTime) {
      setError('Complete los campos obligatorios (*) y seleccione al menos una zona');
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
      laborId: effectiveLaborId,
      activityId: activityId || null,
      observations: observations || '',
      locationId: null,
      zoneSnapshot: selectedZones.join(', '),
      idSupervisor: user?.idSupervisor || 'SUP001',
      supervisorId: user?.idSupervisor || 'SUP001',
      status: 'EN_PROGRESO',
      startTime: startTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })
    };

    const res = await repository.createMachineryOperation(payload);
    setLoading(false);
    if (res.ok) {
      setEquipmentId('');
      setOperatorId('');
      setLaborId(machineryLabor ? machineryLabor.id : '');
      setActivityId('');
      setObservations('');
      setSelectedZones([]);
      setStartTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }));
    } else {
      setError(res.error || 'Error al guardar');
    }
  };

  const handleStop = async (id: string, currentVersion?: number) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
    if (window.confirm(`¿Detener operación mecanizada a las ${nowTime}? Podrá editar el horario en cualquier momento.`)) {
      await repository.updateMachineryOperation(id, {
        status: 'FINALIZADA',
        endTime: nowTime
      }, currentVersion);
    }
  };

  const handleCancel = async (id: string, currentVersion?: number) => {
    if (window.confirm('¿Cancelar operación mecanizada?')) {
      await repository.updateMachineryOperation(id, { status: 'CANCELADA' }, currentVersion);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta operación de maquinaria? Esta acción no se puede deshacer.')) {
      const res = await repository.deleteMachineryOperation(id);
      if (!res.ok) {
        alert(res.error || 'Error al eliminar');
      }
    }
  };

  const openEdit = (op: any) => {
    setEditingOp(op);
    setEditEquipmentId(op.equipmentId || op.equipment_id || '');
    setEditOperatorId(op.operatorId || op.operator_id || '');
    setEditLaborId(op.laborId || op.labor_id || (machineryLabor ? machineryLabor.id : ''));
    setEditActivityId(op.activityId || op.activity_id || '');
    setEditStartTime(op.startTime || op.start_time || '');
    setEditEndTime(op.endTime || op.end_time || '');
    setEditStatus(op.status || 'EN_PROGRESO');
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
    if (!editingOp) return;

    if (!editEquipmentId || !editOperatorId || editSelectedZones.length === 0 || !editStartTime) {
      setEditError('Complete los campos obligatorios (*) y seleccione al menos una zona');
      return;
    }

    setEditLoading(true);
    setEditError('');

    const opObj = catalogs.personnel?.find((p: any) => p.id === editOperatorId);
    const opName = opObj?.name || opObj?.nombreCompleto || '';

    const updatePayload: any = {
      equipmentId: editEquipmentId,
      operatorId: editOperatorId,
      operatorName: opName,
      laborId: editLaborId || (machineryLabor ? machineryLabor.id : null),
      activityId: editActivityId || null,
      startTime: editStartTime,
      endTime: editEndTime || null,
      status: editStatus,
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
          <Card className="lg:col-span-1 h-fit shadow-xs border-forest-900/10">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-forest-50/50 to-transparent">
              <CardTitle className="text-base font-bold text-forest-950 flex items-center gap-2">
                <Tractor size={18} className="text-forest-700" /> Nueva Operación
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleStart} className="space-y-4">
                {error && <div className="text-sm text-negative bg-negative/10 p-2.5 rounded-md">{error}</div>}
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Fecha *</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Clock size={13} className="text-forest-700" /> Hora Inicio *
                    </Label>
                    <Input 
                      type="time" 
                      value={startTime} 
                      onChange={e => setStartTime(e.target.value)} 
                      required 
                      className="font-medium"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tractor / Equipo *</Label>
                  <Combobox
                    options={tractors.map((t: any) => ({
                      value: t.id,
                      label: t.code ? `${t.code} - ${t.name}` : t.name
                    }))}
                    value={equipmentId} 
                    onChange={setEquipmentId} 
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
                    value={operatorId} 
                    onChange={setOperatorId} 
                    placeholder="Seleccione operador..."
                  />
                </div>

                <div>
                  <Label>Labor *</Label>
                  <Combobox
                    options={labors.map((l: any) => ({ value: l.id, label: l.name }))}
                    value={laborId || machineryLabor?.id || ''}
                    onChange={(val) => {
                      setLaborId(val);
                      setActivityId('');
                    }}
                    placeholder="Seleccione labor..."
                  />
                </div>

                <div>
                  <Label>Actividad *</Label>
                  <Combobox
                    options={activities.map((a: any) => ({ value: a.id, label: a.name }))}
                    value={activityId}
                    onChange={setActivityId}
                    placeholder="Seleccione actividad de maquinaria..."
                  />
                </div>

                {/* Selección múltiple de Zonas (Sin lotes) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                      <MapPin size={14} className="text-forest-700" /> Zonas de Trabajo *
                    </Label>
                    <div className="flex items-center gap-2">
                      {zones.length > 0 && selectedZones.length < zones.length && (
                        <button
                          type="button"
                          onClick={selectAllZones}
                          className="text-[11px] text-forest-700 hover:text-forest-900 font-medium hover:underline"
                        >
                          Todas
                        </button>
                      )}
                      {selectedZones.length > 0 && (
                        <button
                          type="button"
                          onClick={clearZones}
                          className="text-[11px] text-red-600 hover:text-red-800 font-medium hover:underline"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-gray-50/90 rounded-xl border border-gray-200/80 min-h-[52px]">
                    {zones.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No hay zonas configuradas en el catálogo</span>
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
                                "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 border",
                                isSelected 
                                  ? "bg-forest-900 text-white border-forest-950 shadow-xs font-semibold" 
                                  : "bg-white text-gray-700 border-gray-200 hover:bg-forest-50 hover:border-forest-300"
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

                  {selectedZones.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-forest-800 bg-forest-50/80 px-2.5 py-1 rounded-md border border-forest-200">
                      <Layers size={12} className="text-forest-700 shrink-0" />
                      <span>
                        <strong>{selectedZones.length}</strong> {selectedZones.length === 1 ? 'zona:' : 'zonas:'} <strong>{selectedZones.join(', ')}</strong>
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">
                      Haga clic en las zonas donde operará la maquinaria
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="machinery-obs">Observaciones (Opcional)</Label>
                  <Input
                    id="machinery-obs"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Notas u observaciones de la operación..."
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full shadow-md font-bold bg-forest-900 hover:bg-forest-950 text-white">
                  <Play size={18} className="mr-2 fill-white" /> {loading ? 'Iniciando...' : 'Iniciar Operación'}
                </Button>
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
                <p className="text-xs text-gray-400 mt-1">Las operaciones iniciadas aparecerán listadas aquí con seguimiento en tiempo real.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysMachinery.map(m => {
                  const eq = catalogs.equipment?.find((e: any) => e.id === m.equipmentId);
                  const op = catalogs.personnel?.find((p: any) => p.id === m.operatorId);
                  const labor = catalogs.labors?.find((l: any) => l.id === (m.laborId || m.labor_id));
                  const act = catalogs.activities?.find((a: any) => a.id === (m.activityId || m.activity_id));
                  const duration = calculateDuration(m.startTime, m.endTime);

                  return (
                    <div key={m.id} className="border border-gray-200/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white hover:border-gray-300 transition-colors shadow-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900 text-base flex items-center gap-2">
                          <Tractor size={18} className="text-forest-700" />
                          {eq?.code ? `${eq.code} - ${eq.name}` : (eq?.name || 'Equipo')}
                        </div>
                        <div className="text-xs text-gray-700 font-medium">
                          Operador: <span className="text-gray-900 font-semibold">{op?.name || m.operatorName || 'Sin asignar'}</span>
                        </div>
                        {(labor || act) && (
                          <div className="text-xs text-forest-900 font-medium">
                            Labor: <span className="font-bold text-forest-950">{labor?.name || 'Maquinaria'}</span>
                            {act?.name && <span className="text-gray-600 font-normal"> — {act.name}</span>}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 flex items-center gap-1.5 pt-0.5">
                          <MapPin size={13} className="text-forest-700 shrink-0" />
                          <span>Zonas: <strong className="text-gray-800">{m.zoneSnapshot || 'No especificada'}</strong></span>
                        </div>
                        {m.observations && (
                          <div className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200/60 mt-1 max-w-md">
                            <span className="font-semibold text-gray-700">Obs:</span> {m.observations}
                          </div>
                        )}
                        
                        {/* Horario y Duración total */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="text-xs font-mono text-gray-700 bg-gray-100 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-200">
                            <Clock size={12} className="text-gray-500" />
                            <span>Inicio: <strong>{m.startTime || '--:--'}</strong></span>
                            {m.endTime && <span>| Fin: <strong>{m.endTime}</strong></span>}
                          </div>
                          {duration && (
                            <span className="text-xs font-bold text-forest-900 bg-lime-100/90 border border-lime-300 px-2 py-0.5 rounded-full">
                              ⏱️ Total: {duration}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botones de Estado y Acciones */}
                      <div className="flex sm:flex-col items-end gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
                        <span className={cn(
                          "px-2.5 py-1 text-xs rounded-full font-bold uppercase tracking-wider",
                          m.status === 'EN_PROGRESO' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            m.status === 'FINALIZADA' ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"
                        )}>
                          {m.status?.replace('_', ' ') || 'EN PROGRESO'}
                        </span>

                        <div className="flex items-center gap-1.5 mt-1">
                          {/* Detener o Cancelar si está en progreso */}
                          {!isDirectivo && m.status === 'EN_PROGRESO' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-700 border border-red-300 hover:bg-red-50 text-xs h-7 px-2 font-bold" 
                                onClick={() => handleCancel(m.id, m.version)}
                                title="Cancelar operación"
                              >
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-forest-900 hover:bg-forest-950 text-white text-xs h-7 px-2.5 font-bold flex items-center gap-1" 
                                onClick={() => handleStop(m.id, m.version)}
                                title="Detener operación y registrar hora de fin"
                              >
                                <Square size={12} className="fill-white" /> Detener
                              </Button>
                            </>
                          )}

                          {/* Botón Editar */}
                          {!isDirectivo && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-gray-700 border-gray-300 hover:bg-gray-100 text-xs h-7 px-2 font-medium flex items-center gap-1"
                              onClick={() => openEdit(m)}
                              title="Editar operación"
                            >
                              <Pencil size={12} /> Editar
                            </Button>
                          )}

                          {/* Botón Eliminar */}
                          {!isDirectivo && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7 w-7 p-0 flex items-center justify-center"
                              onClick={() => handleDelete(m.id)}
                              title="Eliminar operación"
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edición de Operación */}
      <Dialog open={!!editingOp} onOpenChange={(open) => !open && setEditingOp(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-forest-950 flex items-center gap-2">
              <Pencil size={18} className="text-forest-700" /> Editar Operación de Maquinaria
            </DialogTitle>
          </DialogHeader>

          {editError && (
            <div className="text-sm text-negative bg-negative/10 p-2.5 rounded-md flex items-center gap-2">
              <AlertCircle size={16} /> {editError}
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
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

            <div>
              <Label>Actividad *</Label>
              <Combobox
                options={activities.map((a: any) => ({ value: a.id, label: a.name }))}
                value={editActivityId}
                onChange={setEditActivityId}
                placeholder="Seleccione actividad de maquinaria..."
              />
            </div>

            {/* Horarios de Inicio y Fin */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <Label className="flex items-center gap-1 font-semibold text-gray-700">
                  <Clock size={13} className="text-forest-700" /> Hora Inicio *
                </Label>
                <Input 
                  type="time" 
                  value={editStartTime} 
                  onChange={e => setEditStartTime(e.target.value)} 
                  required 
                  className="font-medium bg-white"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 font-semibold text-gray-700">
                  <Clock size={13} className="text-forest-700" /> Hora Fin
                </Label>
                <Input 
                  type="time" 
                  value={editEndTime} 
                  onChange={e => setEditEndTime(e.target.value)} 
                  className="font-medium bg-white"
                />
              </div>
              {editStartTime && editEndTime && (
                <div className="col-span-2 text-xs text-forest-800 font-bold bg-lime-100/90 border border-lime-300 p-2 rounded-lg text-center">
                  ⏱️ Duración calculada: {calculateDuration(editStartTime, editEndTime)}
                </div>
              )}
            </div>

            {/* Estado */}
            <div>
              <Label>Estado de la Operación</Label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              >
                <option value="EN_PROGRESO">EN PROGRESO</option>
                <option value="FINALIZADA">FINALIZADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>

            {/* Zonas de Trabajo */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                <MapPin size={14} className="text-forest-700" /> Zonas de Trabajo *
              </Label>
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-1.5">
                {zones.map((z: string) => {
                  const isSelected = editSelectedZones.includes(z);
                  return (
                    <button
                      key={z}
                      type="button"
                      onClick={() => toggleEditZone(z)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 border",
                        isSelected 
                          ? "bg-forest-900 text-white border-forest-950 shadow-xs font-semibold" 
                          : "bg-white text-gray-700 border-gray-200 hover:bg-forest-50 hover:border-forest-300"
                      )}
                    >
                      {isSelected ? <Check size={12} className="text-lime-400 stroke-[3]" /> : <MapPin size={12} className="text-gray-400" />}
                      <span>{z}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Observaciones</Label>
              <Input
                value={editObservations}
                onChange={e => setEditObservations(e.target.value)}
                placeholder="Notas u observaciones..."
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingOp(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading} className="bg-forest-900 hover:bg-forest-950 text-white font-bold">
                {editLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
