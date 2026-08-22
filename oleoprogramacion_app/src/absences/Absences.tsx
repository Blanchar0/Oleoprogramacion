import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Calendar, UserX, AlertCircle } from 'lucide-react';

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

  const isDirectivo = user?.role === 'DIRECTIVO';

  useEffect(() => {
    const filters: any = { date };
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsub = repository.subscribeAbsences(filters, setTodaysAbsences);
    return () => unsub();
  }, [date, user]);

  const allPersonnel = (catalogs.personnel || []).filter((p:any) => p.active).sort((a: any, b: any) => (a.name || a.nombreCompleto || '').localeCompare(b.name || b.nombreCompleto || '', 'es', { numeric: true }));
  const reasons = [
    'Ausencia injustificada', 'Calamidad doméstica', 'Incapacidad', 
    'Otro', 'Permiso autorizado', 'Suspensión', 'Vacaciones'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!personnelId) {
      setError('Seleccione una persona');
      return;
    }
    setLoading(true);
    const res = await repository.createAbsence({
      date,
      personnelId,
      reason,
      idSupervisor: user?.idSupervisor || null,
      supervisorId: user?.idSupervisor || null,
      observations,
      status: 'REGISTRADA'
    });
    setLoading(false);

    if (res.ok) {
      setSuccess('Inasistencia registrada correctamente');
      setPersonnelId('');
      setObservations('');
    } else {
      setError(res.error || 'Error al guardar');
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

  if (catLoading) return <div className="p-6 text-gray-500">Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <UserX className="w-6 h-6 text-forest-700" /> Inasistencias
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gestión y reporte de ausentismo del personal</p>
        </div>

        {/* Date filter selector for directivos / quick change */}
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
          <Card className="lg:col-span-1 h-fit shadow-xs">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-bold text-gray-800">Registrar Inasistencia</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-sm text-negative bg-negative/10 p-2.5 rounded-md flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                {success && <div className="text-sm text-positive bg-positive/10 p-2.5 rounded-md">{success}</div>}
                
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                
                <div>
                  <Label>Persona</Label>
                  <Combobox 
                    options={allPersonnel.map((p:any) => ({ value: p.id, label: p.name, description: p.jobTitle }))}
                    value={personnelId}
                    onChange={setPersonnelId}
                    placeholder="Seleccione persona..."
                  />
                </div>

                <div>
                  <Label>Motivo</Label>
                  <Combobox 
                    options={reasons.map(r => ({ value: r, label: r }))}
                    value={reason}
                    onChange={setReason}
                  />
                </div>

                <div>
                  <Label>Observaciones</Label>
                  <Input value={observations} onChange={e => setObservations(e.target.value)} placeholder="Detalles de la inasistencia..." />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Registrando...' : 'Registrar Inasistencia'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabla de Inasistencias */}
        <Card className={cn(isDirectivo ? "col-span-1" : "lg:col-span-2", "shadow-xs")}>
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
                            <span className="font-semibold text-gray-900 block">{person?.name || a.personnelDoc || 'Desconocido'}</span>
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
    </div>
  );
}
