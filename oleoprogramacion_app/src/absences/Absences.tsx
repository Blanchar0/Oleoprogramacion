import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Calendar, UserX, AlertCircle, AlertTriangle, CheckCircle2, Tractor, Briefcase, User, MapPin, Check, Pencil, Trash2 } from 'lucide-react';

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

  // Estados para editar o eliminar un reporte existente.
  const [editingAbsence, setEditingAbsence] = useState<any | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deletingAbsenceId, setDeletingAbsenceId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isDirectivo = user?.role === 'DIRECTIVO';
  const canModifyAbsences = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

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
    if (personnelId) {
      targetSet.add(String(personnelId).trim().toLowerCase());
    }
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
            // Si hay más personas, actualizar la lista restando al inasistente manteniendo el status
            await repository.updateProgramming(prog.id, {
              personnelIds: updatedIds,
              numPeople: updatedIds.length,
              status: prog.status || 'CONFIRMADA'
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

      // 2. Determinar supervisor asignado válido para cumplir con la restricción NOT NULL de Supabase
      const assignedSupervisorId = user?.idSupervisor 
        || conflictProgrammings[0]?.supervisorId 
        || conflictProgrammings[0]?.idSupervisor 
        || conflictMachineries[0]?.supervisorId 
        || 'ADMIN';

      // 3. Registrar la Inasistencia
      const res = await repository.createAbsence({
        date,
        personnelId,
        personnelDoc: selectedPerson?.documento || selectedPerson?.id || personnelId,
        personnelName: selectedPerson?.name || selectedPerson?.nombreCompleto || 'Personal',
        reason,
        idSupervisor: assignedSupervisorId,
        supervisorId: assignedSupervisorId,
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

  const openEdit = (absence: any) => {
    setEditingAbsence(absence);
    setEditReason(absence.reason || 'Incapacidad');
    setEditObservations(absence.observations || '');
    setEditError('');
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingAbsence) return;

    setEditLoading(true);
    setEditError('');
    const result = await repository.updateAbsence(editingAbsence.id, {
      reason: editReason,
      observations: editObservations,
    }, editingAbsence.version);
    setEditLoading(false);

    if (!result.ok) {
      setEditError(result.error || 'No fue posible actualizar la inasistencia.');
      return;
    }

    setEditingAbsence(null);
    setSuccess('Inasistencia actualizada correctamente.');
  };

  const handleDelete = async () => {
    if (!deletingAbsenceId) return;

    setDeleteLoading(true);
    const result = await repository.deleteAbsence(deletingAbsenceId);
    setDeleteLoading(false);

    if (!result.ok) {
      setError(result.error || 'No fue posible eliminar la inasistencia.');
      return;
    }

    setDeletingAbsenceId(null);
    setSuccess('Inasistencia eliminada correctamente.');
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
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-500" />
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-auto font-medium"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Inasistencia - Visible para todos (Supervisor / Admin) */}
        {!isDirectivo && (
          <Card className="shadow-xs border-forest-900/10">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <UserX size={18} className="text-red-600" /> Registrar Inasistencia
              </CardTitle>
              <span className="text-[11px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                4 Pasos
              </span>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Banner de resumen dinámico */}
                <div className="p-3 bg-red-950 text-white rounded-xl shadow-xs space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-red-300 flex items-center gap-1">
                    <span>📌</span> ESTÁS REPORTANDO A:
                  </div>
                  <div className="font-black text-sm truncate flex items-center gap-2">
                    <UserX size={16} className="text-red-400 shrink-0" />
                    <span>{selectedPerson?.name || selectedPerson?.nombreCompleto || 'Seleccione una persona...'}</span>
                  </div>
                  {personnelId && (
                    <div className="text-[11px] text-red-200 flex items-center gap-2 pt-0.5 border-t border-red-900">
                      <span>Motivo: <strong>{reason}</strong></span>
                      <span>•</span>
                      <span>Fecha: <strong>{date}</strong></span>
                    </div>
                  )}
                </div>

                {/* 1️⃣ PASO 1: Fecha */}
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-blue-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-black">1</span>
                      FECHA DEL REPORTE *
                    </Label>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Check size={11} className="text-emerald-700" /> LISTO
                    </span>
                  </div>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="bg-white font-bold text-gray-800"
                    required
                  />
                </div>

                {/* 2️⃣ PASO 2: Selección de Personal */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-2 transition-all",
                  personnelId ? "bg-amber-50/60 border-amber-200/80" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center justify-between">
                    <Label className="font-black text-gray-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-xs font-black">2</span>
                      ¿QUIÉN NO ASISTIÓ? *
                    </Label>
                    {personnelId ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Check size={11} className="text-emerald-700" /> LISTO
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
                          Al registrar la inasistencia, el sistema te solicitará confirmar su desprogramación.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3️⃣ PASO 3: Motivo */}
                <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-200/80 space-y-2.5">
                    <Label className="font-black text-red-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                        <span className="w-5 h-5 rounded-full bg-red-600 text-white inline-flex items-center justify-center text-xs font-black">3</span>
                        MOTIVO *
                    </Label>
                    <select 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-white border border-red-200 rounded-xl p-2.5 text-sm font-medium"
                    >
                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                {/* 4️⃣ PASO 4: Observaciones */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <Label className="font-black text-gray-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                    <span className="w-5 h-5 rounded-full bg-gray-700 text-white inline-flex items-center justify-center text-xs font-black">4</span>
                    OBSERVACIONES (OPCIONAL)
                  </Label>
                  <Input 
                    value={observations} 
                    onChange={e => setObservations(e.target.value)} 
                    placeholder="Detalles adicionales..." 
                    className="bg-white"
                  />
                </div>

                <Button 
                    type="submit" 
                    disabled={loading || !personnelId} 
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-black uppercase py-4 rounded-xl"
                >
                    {loading ? 'PROCESANDO...' : 'CONFIRMAR INASISTENCIA'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabla de Inasistencias */}
        <Card className={cn(isDirectivo ? "col-span-1" : "lg:col-span-2", "shadow-xs border-forest-900/10")}>
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-gray-800">Inasistencias del {date}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {todaysAbsences.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <UserX size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="font-medium text-sm">No hay inasistencias registradas en esta fecha.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Personal</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3">Supervisor / Creador</th>
                      <th className="px-4 py-3">Observaciones</th>
                      {canModifyAbsences && <th className="px-4 py-3 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {todaysAbsences.map(a => {
                      const person = catalogs.personnel.find((p:any) => p.id === a.personnelId);
                      const supervisorName = getSupervisorName(a);
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{person?.name || a.personnelName || a.personnelDoc}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-50 text-amber-800 rounded-md text-xs border border-amber-100">{a.reason}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-600">{supervisorName}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{a.observations || '-'}</td>
                          {canModifyAbsences && (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Editar inasistencia"
                                  onClick={() => openEdit(a)}
                                  className="h-8 w-8 text-forest-800 hover:bg-forest-50"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Eliminar inasistencia"
                                  onClick={() => setDeletingAbsenceId(a.id)}
                                  className="h-8 w-8 text-red-700 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          )}
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
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 border-amber-300 shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-1.5 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 mb-1">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Trabajador se encuentra programado
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm text-gray-600 leading-normal break-words">
              La persona <strong className="text-gray-900">{selectedPerson?.name || selectedPerson?.nombreCompleto}</strong> se encuentra programada en la jornada del <strong>{date}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs w-full max-w-full overflow-hidden">
            <div className="p-3 sm:p-3.5 bg-amber-50/90 rounded-xl border border-amber-300 space-y-2.5 w-full overflow-hidden">
              <div className="flex flex-wrap items-center gap-1.5 font-bold text-xs sm:text-sm text-amber-950 break-words">
                <User size={16} className="text-amber-700 shrink-0" />
                <span className="break-words">{selectedPerson?.name || selectedPerson?.nombreCompleto}</span>
                {selectedPerson?.jobTitle && <span className="text-xs font-normal text-amber-800">({selectedPerson.jobTitle})</span>}
              </div>

              {/* Detalle de las programaciones generales activas */}
              {conflictProgrammings.map((prog, idx) => {
                const labor = catalogs.labors?.find((l: any) => l.id === (prog.laborId || prog.labor_id));
                const act = catalogs.activities?.find((a: any) => a.id === (prog.activityId || prog.activity_id));
                const sup = catalogs.supervisors?.find((s: any) => s.id === (prog.supervisorId || prog.idSupervisor));
                const totalPeople = (prog.personnelIds || []).length;
                return (
                  <div key={prog.id || idx} className="bg-white p-2.5 sm:p-3 rounded-lg border border-amber-200 text-gray-700 space-y-1.5 shadow-xs w-full overflow-hidden">
                    <div className="flex items-start gap-1.5 font-bold text-forest-950 text-xs">
                      <Briefcase size={14} className="text-forest-700 shrink-0 mt-0.5" />
                      <span className="break-words">Actividad: {act?.name || labor?.name || 'Labor programada'}</span>
                    </div>
                    {labor?.name && act?.name && (
                      <div className="text-[11px] text-gray-500 pl-5 break-words">
                        Labor: <strong>{labor.name}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-gray-600 pl-5 text-[11px] break-words">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span className="break-words">Ubicación: {prog.zoneSnapshot || prog.loteSnapshot || 'Lote asignado'}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
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
                  <div key={mach.id || idx} className="bg-white p-2.5 sm:p-3 rounded-lg border border-amber-200 text-gray-700 space-y-1.5 shadow-xs w-full overflow-hidden">
                    <div className="flex items-start gap-1.5 font-bold text-blue-900 text-xs">
                      <Tractor size={14} className="text-blue-600 shrink-0 mt-0.5" />
                      <span className="break-words">Maquinaria: {eq?.code ? `${eq.code} - ${eq.name}` : (eq?.name || 'Equipo')}</span>
                    </div>
                    {act?.name && (
                      <div className="text-[11px] text-gray-500 pl-5 break-words">
                        Actividad: <strong>{act.name}</strong>
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500 pl-5 break-words">
                      <span>Zonas: <strong className="text-gray-700">{mach.zoneSnapshot || 'Zonas'}</strong> | Inicio: {mach.startTime || '--:--'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mensaje claro de advertencia */}
            <div className="p-3 sm:p-3.5 bg-red-50 rounded-xl border border-red-200 text-red-950 w-full overflow-hidden">
              <p className="font-bold text-xs leading-snug break-words">
                La persona <span className="underline">{selectedPerson?.name || selectedPerson?.nombreCompleto}</span> se encuentra programada en <span className="underline">{conflictActivityNames || 'actividades del día'}</span>.
              </p>
              <p className="text-[11px] text-red-800 mt-1 leading-snug break-words">
                ¿Deseas eliminarla de la programación y reportarla como inasistente por <strong>{reason}</strong>?
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowWarningModal(false)}
              disabled={loading}
              className="w-full sm:w-auto h-10 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={() => processAbsenceRegistration(true)}
              disabled={loading}
              className="w-full sm:w-auto h-auto min-h-[40px] py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs leading-tight whitespace-normal text-center break-words"
            >
              {loading ? 'Procesando...' : 'Sí, eliminar de la programación y reportar inasistencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAbsence} onOpenChange={(open) => !open && setEditingAbsence(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-forest-950">
              <Pencil size={18} className="text-forest-700" /> Editar inasistencia
            </DialogTitle>
            <DialogDescription>
              Actualiza el motivo u observaciones del reporte seleccionado.
            </DialogDescription>
          </DialogHeader>

          {editingAbsence && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              {editError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
                  <AlertCircle size={16} /> {editError}
                </div>
              )}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-500">Personal: </span>
                <span className="font-bold text-gray-900">
                  {catalogs.personnel.find((p: any) => p.id === editingAbsence.personnelId)?.name || editingAbsence.personnelName || editingAbsence.personnelDoc}
                </span>
              </div>
              <div>
                <Label>Motivo *</Label>
                <select
                  value={editReason}
                  onChange={(event) => setEditReason(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-medium"
                >
                  {reasons.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Input
                  value={editObservations}
                  onChange={(event) => setEditObservations(event.target.value)}
                  placeholder="Detalles adicionales..."
                  className="mt-1"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingAbsence(null)} disabled={editLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={editLoading} className="bg-forest-900 hover:bg-forest-950 text-white">
                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingAbsenceId} onOpenChange={(open) => !open && setDeletingAbsenceId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar inasistencia?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el reporte de inasistencia y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingAbsenceId(null)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleDelete} disabled={deleteLoading} className="bg-red-700 hover:bg-red-800 text-white">
              {deleteLoading ? 'Eliminando...' : 'Eliminar reporte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
