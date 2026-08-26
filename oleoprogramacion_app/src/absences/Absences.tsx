import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Calendar, UserX, AlertCircle, AlertTriangle, CheckCircle2, Tractor, Briefcase, User, MapPin, Check } from 'lucide-react';

export default function Absences() {
  const { user } = useAuth();
  const { catalogs, loading: catLoading } = useCatalogs();

  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [personnelId, setPersonnelId] = useState('');
  const [reason, setReason] = useState('Incapacidad');
  const [observations, setObservations] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [todaysAbsences, setTodaysAbsences] = useState<any[]>([]);
  const [programmings, setProgrammings] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);

  // Estado para el modal de advertencia / desprogramación
  const [showWarningModal, setShowWarningModal] = useState(false);

  const isDirectivo = user?.role === 'DIRECTIVO';

  useEffect(() => {
    const filters: any = { date };
    const unsubAbsences = repository.subscribeAbsences(filters, setTodaysAbsences);
    return () => unsubAbsences();
  }, [date]);

  // Suscribirse a TODAS las programaciones y maquinarias de la fecha para detectar asignaciones
  useEffect(() => {
    const filters: any = { date };
    const unsubProg = repository.subscribeProgramming(filters, setProgrammings);
    const unsubMach = repository.subscribeMachinery(filters, setMachineries);
    return () => {
      unsubProg();
      unsubMach();
    };
  }, [date]);

  const allPersonnel = (catalogs.personnel || [])
    .filter((p: any) => p.active)
    .sort((a: any, b: any) => (a.name || a.nombreCompleto || '').localeCompare(b.name || b.nombreCompleto || '', 'es', { numeric: true }));

  const reasons = [
    'Ausencia injustificada', 'Calamidad doméstica', 'Incapacidad', 
    'Otro', 'Permiso autorizado', 'Suspensión', 'Vacaciones'
  ];

  const selectedPerson = catalogs.personnel?.find((p: any) => p.id === personnelId);

  // Conjunto de identificadores válidos para la persona seleccionada (ID, Documento, Nombre)
  const getPersonTargetIds = () => {
    const targetSet = new Set<string>();
    if (!personnelId) return targetSet;
    targetSet.add(String(personnelId).trim().toLowerCase());
    if (selectedPerson) {
      if (selectedPerson.id) targetSet.add(String(selectedPerson.id).trim().toLowerCase());
      if (selectedPerson.documento) targetSet.add(String(selectedPerson.documento).trim().toLowerCase());
      if (selectedPerson.cedula) targetSet.add(String(selectedPerson.cedula).trim().toLowerCase());
      if (selectedPerson.name) targetSet.add(String(selectedPerson.name).trim().toLowerCase());
      if (selectedPerson.nombreCompleto) targetSet.add(String(selectedPerson.nombreCompleto).trim().toLowerCase());
    }
    return targetSet;
  };

  const personTargetIds = getPersonTargetIds();

  // Conflictos de programación de la persona seleccionada en esta fecha
  const conflictProgrammings = personnelId 
    ? (programmings || []).filter((p: any) => {
        if (p.date !== date || p.status === 'CANCELADA') return false;
        const progIds = Array.isArray(p.personnelIds) ? p.personnelIds : [];
        return progIds.some((rawId: any) => personTargetIds.has(String(rawId).trim().toLowerCase()));
      })
    : [];

  const conflictMachineries = personnelId
    ? (machineries || []).filter((m: any) => {
        if (m.date !== date || m.status === 'CANCELADA') return false;
        const opId = String(m.operatorId || m.operator_id || '').trim().toLowerCase();
        const opName = String(m.operatorName || m.operator_name || '').trim().toLowerCase();
        return (opId && personTargetIds.has(opId)) || (opName && personTargetIds.has(opName));
      })
    : [];

  const hasConflict = conflictProgrammings.length > 0 || conflictMachineries.length > 0;

  // Nombres de actividades en las que se encuentra programado
  const conflictActivityNames = [
    ...conflictProgrammings.map((p: any) => {
      const act = catalogs.activities?.find((a: any) => a.id === (p.activityId || p.activity_id));
      const lab = catalogs.labors?.find((l: any) => l.id === (p.laborId || p.labor_id));
      return act?.name || lab?.name || 'Labor de campo';
    }),
    ...conflictMachineries.map((m: any) => {
      const act = catalogs.activities?.find((a: any) => a.id === (m.activityId || m.activity_id));
      const eq = catalogs.equipment?.find((e: any) => e.id === m.equipmentId);
      return `Maquinaria (${act?.name || eq?.name || 'Operación'})`;
    })
  ].filter(Boolean).join(', ');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!personnelId) {
      setError('Seleccione una persona');
      return;
    }

    // Si la persona ya está reportada en programación general o maquinaria, mostrar aviso warning
    if (hasConflict) {
      setShowWarningModal(true);
      return;
    }

    // Si no tiene conflicto, registrar directamente
    processAbsenceRegistration(false);
  };

  const processAbsenceRegistration = async (removeFromProgramming: boolean) => {
    setLoading(true);
    setError('');

    try {
      // 1. Si se confirmó desprogramar, retirar de la Programación General y Maquinaria
      if (removeFromProgramming) {
        const targetIds = getPersonTargetIds();

        // A. Programación General
        for (const prog of conflictProgrammings) {
          const currentIds: string[] = Array.isArray(prog.personnelIds) ? prog.personnelIds : [];
          const updatedIds = currentIds.filter((rawId: any) => !targetIds.has(String(rawId).trim().toLowerCase()));

          if (updatedIds.length === 0) {
            // Si era la única persona de la labor, eliminar el registro completo de la programación
            await repository.deleteProgramming(prog.id);
          } else {
            // Si hay más personas, actualizar la lista restando al inasistente
            await repository.updateProgramming(prog.id, {
              personnelIds: updatedIds,
              numPeople: updatedIds.length
            }, prog.version);
          }
        }

        // B. Maquinaria (si estaba asignado como tractorista/operador)
        for (const mach of conflictMachineries) {
          await repository.updateMachineryOperation(mach.id, {
            status: 'CANCELADA',
            observations: `Cancelada automáticamente por reporte de inasistencia: ${reason}`
          }, mach.version);
        }
      }

      // 2. Registrar la Inasistencia
      const res = await repository.createAbsence({
        date,
        personnelId,
        personnelDoc: selectedPerson?.documento || selectedPerson?.id || personnelId,
        personnelName: selectedPerson?.name || selectedPerson?.nombreCompleto || 'Personal',
        reason,
        idSupervisor: user?.idSupervisor || null,
        supervisorId: user?.idSupervisor || null,
        observations,
        status: 'REGISTRADA'
      });

      setLoading(false);
      setShowWarningModal(false);

      if (res.ok) {
        const personName = selectedPerson?.name || selectedPerson?.nombreCompleto || 'La persona';
        setSuccess(
          removeFromProgramming 
            ? `${personName} fue eliminada de la programación y se registró su inasistencia correctamente.` 
            : 'Inasistencia registrada correctamente.'
        );
        setPersonnelId('');
        setObservations('');
      } else {
        setError(res.error || 'Error al registrar inasistencia');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Error durante el proceso');
    }
  };

  const getSupervisorName = (absence: any) => {
    const supId = absence.supervisorId || absence.idSupervisor;
    if (!supId) return 'No especificado';
    const sup = catalogs.supervisors?.find((s: any) => s.id === supId);
    if (sup) return sup.name;
    const userSup = catalogs.users?.find((u: any) => u.idSupervisor === supId || u.id === supId);
    if (userSup) return userSup.name;
    return supId;
  };

  if (catLoading) return <div className="p-6 text-gray-500">Cargando catálogo...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <UserX className="w-6 h-6 text-forest-700" /> Inasistencias
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gestión y reporte de ausentismo del personal</p>
        </div>

        {/* Date filter selector */}
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
        {/* Formulario solo para NO Directivos (Supervisores / Admin) */}
        {!isDirectivo && (
          <Card className="lg:col-span-1 h-fit shadow-md border-forest-900/10">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-red-50/80 to-transparent">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserX size={20} className="text-red-600" /> Registrar Inasistencia
                </span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                  4 Pasos
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Banner de Contexto en Vivo */}
              <div className="bg-gradient-to-r from-red-700 to-red-900 text-white p-3 rounded-xl shadow-xs mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <UserX size={18} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-red-200 font-bold block">
                      📌 Estás reportando a:
                    </span>
                    <span className="text-sm font-extrabold text-white truncate block">
                      {selectedPerson?.name || selectedPerson?.nombreCompleto || 'Seleccione una persona...'}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-red-100 mt-0.5">
                      <span>Motivo: <strong className="text-white">{reason}</strong></span>
                      <span>•</span>
                      <span>Fecha: <strong className="text-white">{date}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-negative bg-negative/10 p-2.5 rounded-md flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="text-sm text-positive bg-positive/10 p-2.5 rounded-md flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
                
                {/* 1️⃣ PASO 1: Fecha */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-blue-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-black">1</span>
                      FECHA DEL REPORTE *
                    </Label>
                    {date && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                        <CheckCircle2 size={11} className="text-emerald-700" /> LISTO
                      </span>
                    )}
                  </div>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    required 
                    className="bg-white font-bold text-sm h-10 border-blue-300"
                  />
                </div>
                
                {/* 2️⃣ PASO 2: Persona */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-2 transition-all",
                  personnelId ? "bg-amber-50/60 border-amber-200/80" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-amber-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-xs font-black">2</span>
                      ¿QUIÉN NO ASISTIÓ? *
                    </Label>
                    {personnelId ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                        <CheckCircle2 size={11} className="text-emerald-700" /> LISTO
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold italic uppercase">PENDIENTE</span>
                    )}
                  </div>
                  <Combobox 
                    options={allPersonnel.map((p:any) => ({ value: p.id, label: p.name || p.nombreCompleto, description: p.jobTitle }))}
                    value={personnelId}
                    onChange={setPersonnelId}
                    placeholder="BUSCAR Y SELECCIONAR PERSONA..."
                  />

                  {/* Banner preventivo si ya está programada */}
                  {personnelId && hasConflict && (
                    <div className="mt-2 p-2.5 bg-amber-100 border border-amber-300 rounded-lg text-amber-950 text-xs flex items-start gap-2 animate-fadeIn">
                      <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase">
                          La persona se encuentra programada en: {conflictActivityNames || 'actividades de hoy'}
                        </p>
                        <p className="text-[11px] text-amber-900 mt-0.5">
                          Al registrar la inasistencia, el sistema le ofrecerá retirarla de la programación general.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3️⃣ PASO 3: Motivo con Botones Grandes de 1 Toque */}
                <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-red-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white inline-flex items-center justify-center text-xs font-black">3</span>
                      MOTIVO DE INASISTENCIA (1 TOQUE) *
                    </Label>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 uppercase">
                      <CheckCircle2 size={11} className="text-emerald-700" /> SELECCIONADO
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {[
                      { val: 'Incapacidad', label: 'INCAPACIDAD', icon: '🩹', color: 'border-blue-200 text-blue-900 bg-white hover:bg-blue-50/80', active: 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400' },
                      { val: 'Calamidad doméstica', label: 'CALAMIDAD DOMÉSTICA', icon: '🏠', color: 'border-amber-200 text-amber-900 bg-white hover:bg-amber-50/80', active: 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400' },
                      { val: 'Permiso autorizado', label: 'PERMISO AUTORIZADO', icon: '⏱️', color: 'border-emerald-200 text-emerald-900 bg-white hover:bg-emerald-50/80', active: 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400' },
                      { val: 'Ausencia injustificada', label: 'AUSENCIA INJUSTIFICADA', icon: '❌', color: 'border-red-200 text-red-900 bg-white hover:bg-red-50/80', active: 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400' },
                      { val: 'Vacaciones', label: 'VACACIONES', icon: '🏖️', color: 'border-purple-200 text-purple-900 bg-white hover:bg-purple-50/80', active: 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400' },
                      { val: 'Suspensión', label: 'SUSPENSIÓN LABORAL', icon: '⚠️', color: 'border-rose-200 text-rose-900 bg-white hover:bg-rose-50/80', active: 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400' },
                    ].map(btn => {
                      const isSelected = reason === btn.val;
                      return (
                        <button
                          key={btn.val}
                          type="button"
                          onClick={() => setReason(btn.val)}
                          className={cn(
                            "w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-black uppercase flex items-center justify-between transition-all cursor-pointer",
                            isSelected ? btn.active : btn.color
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg shrink-0">{btn.icon}</span>
                            <span className="font-black tracking-wide leading-snug">{btn.label}</span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Opción Otro si no es de las 6 principales */}
                    <button
                      type="button"
                      onClick={() => setReason('Otro')}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-black uppercase flex items-center justify-between transition-all cursor-pointer",
                        reason === 'Otro' ? "bg-gray-800 text-white border-gray-900 shadow-md ring-2 ring-gray-400" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg shrink-0">📝</span>
                        <span className="font-black tracking-wide leading-snug">OTRO MOTIVO / NO ESPECIFICADO</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 4️⃣ PASO 4: Observaciones y Guardar */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <Label className="font-black text-gray-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                    <span className="w-5 h-5 rounded-full bg-gray-700 text-white inline-flex items-center justify-center text-xs font-black">4</span>
                    OBSERVACIONES (OPCIONAL)
                  </Label>
                  <Input 
                    value={observations} 
                    onChange={e => setObservations(e.target.value)} 
                    placeholder="Detalles adicionales..." 
                    className="bg-white font-medium"
                  />
                </div>

                <div className="pt-2 pb-6">
                  <Button 
                    type="submit" 
                    disabled={loading || !personnelId} 
                    className="w-full min-h-[50px] h-auto py-3 px-4 text-xs sm:text-sm font-black uppercase tracking-wide bg-red-700 hover:bg-red-800 text-white shadow-xl rounded-xl flex items-center justify-center gap-2 cursor-pointer text-center leading-snug whitespace-normal"
                  >
                    <CheckCircle2 size={20} className="shrink-0" />
                    <span>{loading ? 'PROCESANDO...' : 'CONFIRMAR Y REGISTRAR INASISTENCIA'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabla de Inasistencias */}
        <Card className={cn(isDirectivo ? "col-span-1" : "lg:col-span-2", "shadow-xs border-forest-900/10")}>
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-800">Inasistencias del {date}</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">{todaysAbsences.length} registro{todaysAbsences.length === 1 ? '' : 's'} en esta fecha</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {todaysAbsences.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <UserX size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="font-medium text-sm">No hay inasistencias registradas en esta fecha.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200/80">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 bg-gray-50/90 uppercase border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Persona</th>
                      <th className="px-4 py-3 font-semibold">Motivo</th>
                      <th className="px-4 py-3 font-semibold">Supervisor</th>
                      <th className="px-4 py-3 font-semibold">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {todaysAbsences.map(a => {
                      const person = catalogs.personnel.find((p:any) => p.id === a.personnelId);
                      const supervisorName = getSupervisorName(a);
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-900 block">{person?.name || a.personnelName || a.personnelDoc || 'Desconocido'}</span>
                            {person?.jobTitle && <span className="text-xs text-gray-500">{person.jobTitle}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                              {a.reason || 'Sin motivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                            {supervisorName}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                            {a.observations ? a.observations : <span className="text-gray-400 italic">Sin observaciones</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal / Cuadro de Advertencia (Warning) cuando la persona ya está programada */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="sm:max-w-lg border-amber-300 shadow-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-2">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-gray-900">
              Trabajador se encuentra programado
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-600">
              La persona <strong>{selectedPerson?.name || selectedPerson?.nombreCompleto}</strong> se encuentra programada en la jornada del <strong>{date}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-300 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <User size={16} className="text-amber-700" />
                <span>{selectedPerson?.name || selectedPerson?.nombreCompleto}</span>
                {selectedPerson?.jobTitle && <span className="text-xs font-normal text-amber-800">({selectedPerson.jobTitle})</span>}
              </div>

              {/* Detalle de las programaciones generales activas */}
              {conflictProgrammings.map((prog, idx) => {
                const labor = catalogs.labors?.find((l: any) => l.id === (prog.laborId || prog.labor_id));
                const act = catalogs.activities?.find((a: any) => a.id === (prog.activityId || prog.activity_id));
                const sup = catalogs.supervisors?.find((s: any) => s.id === (prog.supervisorId || prog.idSupervisor));
                const totalPeople = (prog.personnelIds || []).length;
                return (
                  <div key={prog.id || idx} className="bg-white p-3 rounded-lg border border-amber-200 text-gray-700 space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 font-bold text-forest-950 text-xs">
                      <Briefcase size={14} className="text-forest-700" />
                      <span>Actividad: {act?.name || labor?.name || 'Labor programada'}</span>
                    </div>
                    {labor?.name && act?.name && (
                      <div className="text-[11px] text-gray-500 pl-5">
                        Labor: <strong>{labor.name}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-gray-600 pl-5">
                      <MapPin size={13} className="text-gray-400" />
                      <span>Ubicación: {prog.zoneSnapshot || prog.loteSnapshot || 'Lote asignado'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
                      <span>Supervisor: <strong className="text-gray-700">{sup?.name || prog.supervisorId || 'Asignado'}</strong></span>
                      <span>Cuadrilla: <strong>{totalPeople} {totalPeople === 1 ? 'persona' : 'personas'}</strong></span>
                    </div>
                  </div>
                );
              })}

              {/* Detalle de maquinaria activa si aplica */}
              {conflictMachineries.map((mach, idx) => {
                const eq = catalogs.equipment?.find((e: any) => e.id === mach.equipmentId);
                const act = catalogs.activities?.find((a: any) => a.id === (mach.activityId || mach.activity_id));
                return (
                  <div key={mach.id || idx} className="bg-white p-3 rounded-lg border border-amber-200 text-gray-700 space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                      <Tractor size={14} className="text-blue-600" />
                      <span>Maquinaria: {eq?.code ? `${eq.code} - ${eq.name}` : (eq?.name || 'Equipo')}</span>
                    </div>
                    {act?.name && (
                      <div className="text-[11px] text-gray-500 pl-5">
                        Actividad: <strong>{act.name}</strong>
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500 pl-5">
                      <span>Zonas: <strong className="text-gray-700">{mach.zoneSnapshot || 'Zonas'}</strong> | Inicio: {mach.startTime || '--:--'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mensaje claro de advertencia */}
            <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-red-950">
              <p className="font-bold text-xs">
                La persona <span className="underline">{selectedPerson?.name}</span> se encuentra programada en <span className="underline">{conflictActivityNames || 'actividades del día'}</span>.
              </p>
              <p className="text-[11px] text-red-800 mt-1">
                ¿Deseas eliminarla de la programación y reportarla como inasistente por <strong>{reason}</strong>?
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowWarningModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={() => processAbsenceRegistration(true)}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {loading ? 'Procesando...' : 'Sí, eliminar de la programación y reportar inasistencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
