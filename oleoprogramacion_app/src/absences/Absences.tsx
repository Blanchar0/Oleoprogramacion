import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { 
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Calendar, UserX, AlertCircle, AlertTriangle, CheckCircle2, Tractor, Briefcase, User, MapPin } from 'lucide-react';

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
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsubAbsences = repository.subscribeAbsences(filters, setTodaysAbsences);
    return () => unsubAbsences();
  }, [date, user]);

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

  // Conflictos de programación de la persona seleccionada en esta fecha
  const conflictProgrammings = personnelId 
    ? (programmings || []).filter((p: any) => 
        p.date === date && 
        p.status !== 'CANCELADA' && 
        (p.personnelIds || []).includes(personnelId)
      )
    : [];

  const conflictMachineries = personnelId
    ? (machineries || []).filter((m: any) =>
        m.date === date &&
        m.status !== 'CANCELADA' &&
        m.operatorId === personnelId
      )
    : [];

  const hasConflict = conflictProgrammings.length > 0 || conflictMachineries.length > 0;
  const selectedPerson = catalogs.personnel?.find((p: any) => p.id === personnelId);

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
        // A. Programación General
        for (const prog of conflictProgrammings) {
          const currentIds: string[] = prog.personnelIds || [];
          const updatedIds = currentIds.filter((id: string) => id !== personnelId);

          if (updatedIds.length === 0) {
            // Si era la única persona de la labor, eliminar el registro completo
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
        setSuccess(
          removeFromProgramming 
            ? 'Inasistencia registrada exitosamente y persona retirada de la Programación General.' 
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
          <Card className="lg:col-span-1 h-fit shadow-xs border-forest-900/10">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-forest-50/50 to-transparent">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <UserX size={18} className="text-forest-700" /> Registrar Inasistencia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
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
                
                <div>
                  <Label>Fecha *</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                
                <div>
                  <Label>Persona *</Label>
                  <Combobox 
                    options={allPersonnel.map((p:any) => ({ value: p.id, label: p.name || p.nombreCompleto, description: p.jobTitle }))}
                    value={personnelId}
                    onChange={setPersonnelId}
                    placeholder="Seleccione persona..."
                  />
                  {/* Banner preventivo si ya está programada */}
                  {personnelId && hasConflict && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2 animate-fadeIn">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Trabajador asignado en programación hoy</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Al registrar la inasistencia se le advertirá para retirarlo de la programación general.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Motivo *</Label>
                  <Combobox 
                    options={reasons.map(r => ({ value: r, label: r }))}
                    value={reason}
                    onChange={setReason}
                  />
                </div>

                <div>
                  <Label>Observaciones (Opcional)</Label>
                  <Input 
                    value={observations} 
                    onChange={e => setObservations(e.target.value)} 
                    placeholder="Detalles de la inasistencia..." 
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full font-bold bg-forest-900 hover:bg-forest-950 text-white">
                  {loading ? 'Procesando...' : 'Registrar Inasistencia'}
                </Button>
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
        <DialogContent className="sm:max-w-lg border-amber-200">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-2">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-gray-900">
              Trabajador reportado en Programación
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-600">
              La persona seleccionada ya se encuentra registrada en la jornada del <strong>{date}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <User size={15} className="text-amber-700" />
                {selectedPerson?.name || selectedPerson?.nombreCompleto || 'Trabajador'}
                {selectedPerson?.jobTitle && <span className="text-xs font-normal text-amber-800">({selectedPerson.jobTitle})</span>}
              </div>

              {/* Detalle de las programaciones generales activas */}
              {conflictProgrammings.map((prog, idx) => {
                const labor = catalogs.labors?.find((l: any) => l.id === (prog.laborId || prog.labor_id));
                const sup = catalogs.supervisors?.find((s: any) => s.id === (prog.supervisorId || prog.idSupervisor));
                const totalPeople = (prog.personnelIds || []).length;
                return (
                  <div key={prog.id || idx} className="bg-white p-2.5 rounded-lg border border-amber-200 text-gray-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-forest-950">
                      <Briefcase size={13} className="text-forest-700" />
                      <span>Labor: {labor?.name || 'Programación General'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MapPin size={13} className="text-gray-500" />
                      <span>Ubicación: {prog.zoneSnapshot || prog.loteSnapshot || 'Lote asignado'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                      <span>Supervisor: <strong className="text-gray-700">{sup?.name || prog.supervisorId || 'Asignado'}</strong></span>
                      <span>Cuadrilla: <strong>{totalPeople} {totalPeople === 1 ? 'persona' : 'personas'}</strong></span>
                    </div>
                  </div>
                );
              })}

              {/* Detalle de maquinaria activa si aplica */}
              {conflictMachineries.map((mach, idx) => {
                const eq = catalogs.equipment?.find((e: any) => e.id === mach.equipmentId);
                return (
                  <div key={mach.id || idx} className="bg-white p-2.5 rounded-lg border border-amber-200 text-gray-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                      <Tractor size={13} className="text-blue-600" />
                      <span>Maquinaria: {eq?.code ? `${eq.code} - ${eq.name}` : (eq?.name || 'Equipo')}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      <span>Zonas: <strong className="text-gray-700">{mach.zoneSnapshot || 'Zonas'}</strong> | Inicio: {mach.startTime || '--:--'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-red-50/80 rounded-xl border border-red-200 text-red-900">
              <p className="font-semibold text-xs text-red-950">¿Desea reportarlo como inasistente?</p>
              <p className="text-[11px] text-red-800 mt-0.5">
                Al confirmar, se eliminará automáticamente a <strong>{selectedPerson?.name}</strong> de la Programación General de hoy y se registrará su inasistencia por <strong>{reason}</strong>.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
              {loading ? 'Procesando...' : 'Sí, reportar inasistencia y desprogramar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
