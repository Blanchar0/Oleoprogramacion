import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Play, Square, Tractor, Calendar, MapPin, Check, Layers, Clock, Pencil, Trash2, X, AlertCircle, Pause } from 'lucide-react';

export function normalizeTimeForInput(timeStr?: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(trimmed)) {
    return trimmed.substring(0, 5);
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([aApP])\.?\s*[mM]?\.?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const isPM = match[3].toLowerCase() === 'p';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return trimmed;
}

export function getMaxShiftHoursForDate(dateStr?: string): number {
  if (!dateStr) return 8;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 8;
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 6) {
    return 6; // Sábados: jornada máxima de 6 horas
  }
  return 8; // Lunes a Viernes: jornada máxima de 8 horas
}

export function getAutoEndTimeForDate(dateStr: string, startTime?: string): string {
  if (!startTime) return '17:00';
  const parts = startTime.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return '17:00';
  const maxHours = getMaxShiftHoursForDate(dateStr);
  let endHour = parts[0] + maxHours;
  let endMin = parts[1];
  if (endHour >= 24) endHour = endHour - 24;
  return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
}

export function isOverShiftLimit(dateStr: string, startTime?: string): boolean {
  if (!startTime || !dateStr) return false;
  const parts = startTime.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
  
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const startDate = new Date(y, m - 1, d, parts[0], parts[1], 0);
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const maxHours = getMaxShiftHoursForDate(dateStr);
  return diffHours >= maxHours;
}

export function shouldAutoStartOperation(dateStr: string, startTime?: string): boolean {
  if (!dateStr || !startTime) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const parts = startTime.split(':').map(Number);
  if (!y || !m || !d || parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;

  const scheduledStart = new Date(y, m - 1, d, parts[0], parts[1], 0);
  const now = new Date();
  return now.getTime() >= scheduledStart.getTime();
}

export function calculateDuration(startTime?: string, endTime?: string, dateStr?: string): string | null {
  if (!startTime) return null;
  const partsStart = startTime.split(':').map(Number);
  if (partsStart.length < 2 || isNaN(partsStart[0]) || isNaN(partsStart[1])) return null;

  let endH: number;
  let endM: number;

  if (endTime) {
    const partsEnd = endTime.split(':').map(Number);
    if (partsEnd.length < 2 || isNaN(partsEnd[0]) || isNaN(partsEnd[1])) return null;
    endH = partsEnd[0];
    endM = partsEnd[1];
  } else {
    const now = new Date();
    endH = now.getHours();
    endM = now.getMinutes();
  }

  let startMins = partsStart[0] * 60 + partsStart[1];
  let endMins = endH * 60 + endM;

  let diffMins = endMins - startMins;
  if (diffMins < 0) {
    diffMins = 0;
  }

  const maxHours = getMaxShiftHoursForDate(dateStr);
  const maxMins = maxHours * 60;
  if (diffMins > maxMins) {
    diffMins = maxMins;
  }

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

  // Estados para Modales In-App de Detener, Cancelar y Eliminar
  const [stoppingOp, setStoppingOp] = useState<{ op: any; endTime: string } | null>(null);
  const [cancellingOp, setCancellingOp] = useState<any | null>(null);
  const [deletingOpId, setDeletingOpId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isDirectivo = user?.role === 'DIRECTIVO';

  // Chequeo periódico y sincronización automática de operaciones:
  // 1. Activa automáticamente a EN_PROGRESO si llegó la hora de una operación PROGRAMADA
  // 2. Auto-pausa a PAUSADA si excede la jornada máxima (8h lun-vie, 6h sábados)
  const checkAndAutoManageOperations = (items: any[]) => {
    items.forEach((m) => {
      if (m.status === 'CANCELADA' || m.status === 'FINALIZADA') return;

      // Regla 1: Si está PROGRAMADA y ya llegó la hora establecida, pasa automáticamente a EN_PROGRESO
      if (m.status === 'PROGRAMADA' && m.startTime && shouldAutoStartOperation(m.date, m.startTime)) {
        repository.updateMachineryOperation(m.id, {
          status: 'EN_PROGRESO',
        }, m.version);
        return;
      }

      // Regla 2: Si está EN_PROGRESO y supera la jornada máxima (8h de lunes a viernes, 6h los sábados), se auto-pausa
      if (m.status === 'EN_PROGRESO' && m.startTime && isOverShiftLimit(m.date, m.startTime)) {
        const autoEndTime = getAutoEndTimeForDate(m.date, m.startTime);
        const maxH = getMaxShiftHoursForDate(m.date);
        const autoNote = m.observations 
          ? (m.observations.includes('Auto-pausada') ? m.observations : `${m.observations} (Auto-pausada por límite de jornada de ${maxH}h)`)
          : `Auto-pausada por límite de jornada laboral (${maxH}h)`;

        repository.updateMachineryOperation(m.id, {
          status: 'PAUSADA',
          endTime: autoEndTime,
          observations: autoNote
        }, m.version);
      }
    });
  };

  // Suscribirse a TODAS las operaciones de la fecha sin filtrar por supervisor
  useEffect(() => {
    const filters: any = { date };
    const unsub = repository.subscribeMachinery(filters, (items) => {
      setTodaysMachinery(items);
      checkAndAutoManageOperations(items);
    });
    return () => unsub();
  }, [date]);

  // Chequeo periódico cada 60s
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndAutoManageOperations(todaysMachinery);
    }, 60000);
    return () => clearInterval(interval);
  }, [todaysMachinery]);

  const isTractorista = (person: any): boolean => {
    if (!person) return false;
    const cargo = (person.jobTitle || person.laborCargo || person.cargo || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cuadrilla = (person.cuadrilla || person.zona || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cargo.includes('TRACTOR') || cargo.includes('MAQUIN') || cargo.includes('OPERADOR') ||
           cuadrilla.includes('TRACTOR') || cuadrilla.includes('MAQUIN');
  };

  const machineryLabor = (catalogs.labors || []).find((l: any) => 
    (l.name || '').toUpperCase().includes('MAQUINARIA')
  );

  const tractors = (catalogs.equipment || []).filter((e: any) => e.active);
  const operatorOptions = (catalogs.personnel || []).filter((p: any) => p.active);
  const labors = (catalogs.labors || []).filter((l: any) => l.active);

  const effectiveLaborForActivities = editLaborId || laborId || (machineryLabor ? machineryLabor.id : '');
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
    const effectiveLaborId = laborId || machineryLabor?.id;
    if (!equipmentId || !operatorId || !effectiveLaborId || selectedZones.length === 0 || !startTime) {
      setError('Complete los campos obligatorios (*) y seleccione al menos una zona');
      return;
    }
    setError('');
    setLoading(true);

    const opObj = catalogs.personnel?.find((p: any) => p.id === operatorId);
    const opName = opObj?.name || opObj?.nombreCompleto || '';

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

    // Si la fecha es posterior a hoy, o si es hoy pero la hora es futura:
    const isFuture = date > todayStr || (date === todayStr && startTime > currentTimeStr);
    const initialStatus = isFuture ? 'PROGRAMADA' : 'EN_PROGRESO';

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
      status: initialStatus,
      startTime: startTime || currentTimeStr
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

  const handlePause = async (op: any) => {
    setActionLoading(true);
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
    const res = await repository.updateMachineryOperation(op.id, {
      status: 'PAUSADA',
      endTime: nowTime
    }, op.version);
    setActionLoading(false);
    if (!res.ok) alert(res.error || 'Error al pausar operación');
  };

  const handleResume = async (op: any) => {
    setActionLoading(true);
    const res = await repository.updateMachineryOperation(op.id, {
      status: 'EN_PROGRESO',
      endTime: null
    }, op.version);
    setActionLoading(false);
    if (!res.ok) alert(res.error || 'Error al reanudar operación');
  };

  const handleStartNow = async (op: any) => {
    setActionLoading(true);
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
    const res = await repository.updateMachineryOperation(op.id, {
      status: 'EN_PROGRESO',
      startTime: nowTime
    }, op.version);
    setActionLoading(false);
    if (!res.ok) alert(res.error || 'Error al iniciar operación');
  };

  const handleConfirmStop = async () => {
    if (!stoppingOp) return;
    setActionLoading(true);
    const cleanEndTime = normalizeTimeForInput(stoppingOp.endTime);
    const res = await repository.updateMachineryOperation(stoppingOp.op.id, {
      status: 'FINALIZADA',
      endTime: cleanEndTime
    }, stoppingOp.op.version);
    setActionLoading(false);
    if (res.ok) {
      setStoppingOp(null);
    } else {
      alert(res.error || 'Error al detener operación');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOp) return;
    setActionLoading(true);
    const res = await repository.updateMachineryOperation(cancellingOp.id, {
      status: 'CANCELADA'
    }, cancellingOp.version);
    setActionLoading(false);
    if (res.ok) {
      setCancellingOp(null);
    } else {
      alert(res.error || 'Error al cancelar operación');
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
    setEditLaborId(op.laborId || op.labor_id || (machineryLabor ? machineryLabor.id : ''));
    setEditActivityId(op.activityId || op.activity_id || '');
    setEditStartTime(normalizeTimeForInput(op.startTime || op.start_time || ''));
    setEditEndTime(normalizeTimeForInput(op.endTime || op.end_time || ''));
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
    const effectiveLaborId = editLaborId || (machineryLabor ? machineryLabor.id : null);
    const cleanStartTime = normalizeTimeForInput(editStartTime);
    const cleanEndTime = normalizeTimeForInput(editEndTime);

    if (!editEquipmentId || !editOperatorId || !effectiveLaborId || editSelectedZones.length === 0 || !cleanStartTime) {
      setEditError('Complete los campos obligatorios (*) y seleccione al menos una zona');
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
      laborId: effectiveLaborId,
      activityId: editActivityId || null,
      startTime: cleanStartTime,
      endTime: cleanEndTime || null,
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
                const currentLabor = labors.find((l: any) => l.id === (laborId || machineryLabor?.id));
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
                
                {/* 1️⃣ PASO 1: Fecha y Horario */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-blue-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-black">1</span>
                      FECHA Y HORA DE INICIO *
                    </Label>
                    {date && startTime && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                        <Check size={11} className="text-emerald-700 stroke-[3]" /> LISTO
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-blue-950 font-black uppercase tracking-wide">FECHA *</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-white font-bold text-sm h-10 border-blue-300" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1 text-xs text-blue-950 font-black uppercase tracking-wide">
                        <Clock size={13} className="text-blue-700" /> HORA INICIO *
                      </Label>
                      <Input 
                        type="time" 
                        value={startTime} 
                        onChange={e => setStartTime(e.target.value)} 
                        required 
                        className="w-full font-bold text-sm h-10 bg-white border-blue-300"
                      />
                    </div>
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
                  activityId && selectedZones.length > 0 ? "bg-emerald-50/60 border-emerald-200/80" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-emerald-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-xs font-black">3</span>
                      LABOR Y ZONAS DE OPERACIÓN *
                    </Label>
                    {activityId && selectedZones.length > 0 ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                        <Check size={11} className="text-emerald-700 stroke-[3]" /> LISTO
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-800 font-bold italic uppercase">PENDIENTE</span>
                    )}
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
                  {(() => {
                    const now = new Date();
                    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
                    const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
                    const isFuture = date > todayStr || (date === todayStr && startTime > currentTimeStr);

                    return (
                      <Button 
                        type="submit" 
                        disabled={loading || !equipmentId || !operatorId || selectedZones.length === 0} 
                        className={cn(
                          "w-full min-h-[50px] h-auto py-3 px-4 shadow-xl font-black text-xs sm:text-sm uppercase tracking-wide text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer text-center leading-snug whitespace-normal transition-colors",
                          isFuture ? "bg-indigo-900 hover:bg-indigo-950" : "bg-purple-900 hover:bg-purple-950"
                        )}
                      >
                        <Play size={18} className="fill-white shrink-0" />
                        <span>
                          {loading 
                            ? 'PROCESANDO...' 
                            : isFuture 
                              ? 'PROGRAMAR OPERACIÓN MECANIZADA' 
                              : 'INICIAR OPERACIÓN MECANIZADA'}
                        </span>
                      </Button>
                    );
                  })()}
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
                <p className="text-xs text-gray-400 mt-1">Las operaciones iniciadas aparecerán listadas aquí con seguimiento en tiempo real.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysMachinery.map(m => {
                  const eq = catalogs.equipment?.find((e: any) => e.id === m.equipmentId);
                  const op = catalogs.personnel?.find((p: any) => p.id === m.operatorId);
                  const labor = catalogs.labors?.find((l: any) => l.id === (m.laborId || m.labor_id));
                  const act = catalogs.activities?.find((a: any) => a.id === (m.activityId || m.activity_id));
                  const duration = calculateDuration(m.startTime, m.endTime, m.date);

                  return (
                    <div key={m.id} className="border border-forest-900/15 rounded-xl p-4 bg-white shadow-xs hover:border-forest-900/30 transition-all space-y-3">
                      {/* Header de la operación */}
                      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2.5">
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

                        <span className={cn(
                          "px-2.5 py-1 text-xs rounded-full font-bold uppercase tracking-wider shrink-0",
                          m.status === 'EN_PROGRESO' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                          m.status === 'PROGRAMADA' ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                          m.status === 'PAUSADA' ? "bg-amber-100 text-amber-900 border border-amber-300" :
                          m.status === 'FINALIZADA' ? "bg-green-100 text-green-800 border border-green-200" : 
                          "bg-red-100 text-red-800 border border-red-200"
                        )}>
                          {m.status === 'EN_PROGRESO' ? 'EN PROGRESO' :
                           m.status === 'PROGRAMADA' ? 'PROGRAMADA' :
                           m.status === 'PAUSADA' ? 'PAUSADA' :
                           m.status === 'FINALIZADA' ? 'FINALIZADA' : (m.status?.replace('_', ' ') || 'EN PROGRESO')}
                        </span>
                      </div>

                      {/* Detalles: Labor y Zonas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
                      </div>

                      {/* Observaciones si existen */}
                      {m.observations && (
                        <div className="text-xs text-gray-600 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-200/60">
                          <strong className="text-gray-700">Obs:</strong> {m.observations}
                        </div>
                      )}

                      {/* Footer: Horario a la izquierda, Acciones alineadas a la derecha */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        {/* Horario */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xs font-mono text-gray-700 bg-gray-100 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200">
                            <Clock size={13} className="text-gray-500" />
                            <span>Inicio: <strong>{m.startTime || '--:--'}</strong></span>
                            {m.endTime && <span>| Fin: <strong>{m.endTime}</strong></span>}
                          </div>
                          {duration && (
                            <span className="text-xs font-bold text-forest-900 bg-lime-100/90 border border-lime-300 px-2 py-0.5 rounded-full">
                              ⏱️ {duration}
                            </span>
                          )}
                        </div>

                        {/* Botones de Acción */}
                        {!isDirectivo && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            {m.status === 'PROGRAMADA' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-700 border border-red-300 hover:bg-red-50 text-xs h-7 px-2.5 font-bold cursor-pointer" 
                                  onClick={() => setCancellingOp(m)}
                                  title="Cancelar programación"
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs h-7 px-3 font-bold flex items-center gap-1 cursor-pointer" 
                                  onClick={() => handleStartNow(m)}
                                  title="Iniciar ahora la operación"
                                >
                                  <Play size={12} className="fill-white" /> Iniciar Ahora
                                </Button>
                              </>
                            )}

                            {m.status === 'EN_PROGRESO' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-amber-800 border border-amber-300 hover:bg-amber-50 text-xs h-7 px-2.5 font-bold flex items-center gap-1 cursor-pointer" 
                                  onClick={() => handlePause(m)}
                                  title="Pausar operación"
                                >
                                  <Pause size={12} /> Pausar
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-forest-900 hover:bg-forest-950 text-white text-xs h-7 px-3 font-bold flex items-center gap-1 cursor-pointer" 
                                  onClick={() => {
                                    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
                                    setStoppingOp({ op: m, endTime: nowTime });
                                  }}
                                  title="Finalizar operación y registrar hora de fin"
                                >
                                  <Square size={12} className="fill-white" /> Finalizar
                                </Button>
                              </>
                            )}

                            {m.status === 'PAUSADA' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7 px-3 font-bold flex items-center gap-1 cursor-pointer" 
                                  onClick={() => handleResume(m)}
                                  title="Reanudar operación"
                                >
                                  <Play size={12} className="fill-white" /> Reanudar
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-forest-900 hover:bg-forest-950 text-white text-xs h-7 px-3 font-bold flex items-center gap-1 cursor-pointer" 
                                  onClick={() => {
                                    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
                                    setStoppingOp({ op: m, endTime: nowTime });
                                  }}
                                  title="Finalizar operación"
                                >
                                  <Square size={12} className="fill-white" /> Finalizar
                                </Button>
                              </>
                            )}

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

              <div>
                <Label>Labor *</Label>
                <Combobox
                  options={labors.map((l: any) => ({ value: l.id, label: l.name }))}
                  value={editLaborId || machineryLabor?.id || ''}
                  onChange={(val) => {
                    setEditLaborId(val);
                    setEditActivityId('');
                  }}
                  placeholder="Seleccione labor..."
                />
              </div>

              <div>
                <Label>Actividad</Label>
                <Combobox
                  options={(catalogs.activities || [])
                    .filter((a: any) => a.active && (!editLaborId || a.laborId === editLaborId))
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

              {/* Horarios y Estado */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Hora Inicio *</Label>
                  <Input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Hora Fin</Label>
                  <Input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Combobox
                    options={[
                      { value: 'PROGRAMADA', label: 'Programada' },
                      { value: 'EN_PROGRESO', label: 'En Progreso' },
                      { value: 'PAUSADA', label: 'Pausada' },
                      { value: 'FINALIZADA', label: 'Finalizada' },
                      { value: 'CANCELADA', label: 'Cancelada' },
                    ]}
                    value={editStatus}
                    onChange={setEditStatus}
                  />
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

      {/* Modal In-App para Detener / Finalizar Operación */}
      <Dialog open={!!stoppingOp} onOpenChange={(open) => !open && setStoppingOp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-forest-950 font-bold">
              <Square size={18} className="text-red-600 fill-red-600" /> Detener Operación Mecanizada
            </DialogTitle>
          </DialogHeader>
          {stoppingOp && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-700">
                ¿Desea registrar la finalización de la labor para el operador <strong className="text-forest-950">{stoppingOp.op.operatorName}</strong>?
              </p>
              <div>
                <Label className="text-xs font-black uppercase text-gray-800 tracking-wide">HORA DE FINALIZACIÓN *</Label>
                <Input 
                  type="time" 
                  value={stoppingOp.endTime} 
                  onChange={e => setStoppingOp(prev => prev ? { ...prev, endTime: e.target.value } : null)} 
                  className="bg-white font-bold text-base h-11 border-gray-300 mt-1"
                  required
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setStoppingOp(null)} disabled={actionLoading}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmStop} 
                  disabled={actionLoading || !stoppingOp.endTime}
                  className="bg-red-700 hover:bg-red-800 text-white font-bold cursor-pointer"
                >
                  {actionLoading ? 'Finalizando...' : 'Confirmar y Detener'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal In-App para Cancelar Operación */}
      <Dialog open={!!cancellingOp} onOpenChange={(open) => !open && setCancellingOp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 font-bold">
              <AlertCircle size={18} /> Cancelar Operación Mecanizada
            </DialogTitle>
          </DialogHeader>
          {cancellingOp && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-700">
                ¿Está seguro de marcar como <strong className="text-red-700 uppercase">CANCELADA</strong> la operación del operador <strong>{cancellingOp.operatorName}</strong>?
              </p>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setCancellingOp(null)} disabled={actionLoading}>
                  Volver
                </Button>
                <Button 
                  onClick={handleConfirmCancel} 
                  disabled={actionLoading}
                  className="bg-red-700 hover:bg-red-800 text-white font-bold cursor-pointer"
                >
                  {actionLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
                </Button>
              </DialogFooter>
            </div>
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
