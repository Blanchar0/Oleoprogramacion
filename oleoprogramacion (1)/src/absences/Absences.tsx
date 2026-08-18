import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';

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

  useEffect(() => {
    const filters: any = { date };
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsub = repository.subscribeAbsences(filters, setTodaysAbsences);
    return () => unsub();
  }, [date, user]);

  const allPersonnel = catalogs.personnel.filter((p:any) => p.active);
  const reasons = [
    'Incapacidad', 'Calamidad doméstica', 'Permiso autorizado', 
    'Ausencia injustificada', 'Vacaciones', 'Suspensión', 'Otro'
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

  const handleCancel = async (id: string, currentVersion: number) => {
    if (window.confirm('¿Está seguro de cancelar esta inasistencia?')) {
      const res = await repository.updateAbsence(id, { status: 'CANCELADA' }, currentVersion);
      if (res.ok) {
        setSuccess('Inasistencia cancelada');
      } else {
        alert(res.error);
      }
    }
  };

  if (catLoading) return <div>Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Inasistencias</h2>
        <p className="text-gray-500 text-sm mt-1">Gestión de ausentismo del personal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Registrar</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="text-sm text-negative bg-negative/10 p-2 rounded">{error}</div>}
              {success && <div className="text-sm text-positive bg-positive/10 p-2 rounded">{success}</div>}
              
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
                  placeholder="Seleccione..."
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
                <Input value={observations} onChange={e => setObservations(e.target.value)} />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Registrando...' : 'Registrar Inasistencia'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inasistencias del {date}</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysAbsences.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay inasistencias registradas en esta fecha.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-md">Persona</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 rounded-tr-md">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysAbsences.map(a => {
                      const person = catalogs.personnel.find((p:any) => p.id === a.personnelId);
                      return (
                        <tr key={a.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-3 font-medium">{person?.name}</td>
                          <td className="px-4 py-3">{a.reason}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-1 text-xs rounded-full font-medium",
                              a.status === 'REGISTRADA' ? "bg-warning/20 text-warning-700" : "bg-gray-100 text-gray-500"
                            )}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {a.status === 'REGISTRADA' && (
                              <Button variant="ghost" size="sm" className="text-negative" onClick={() => handleCancel(a.id, a.version)}>
                                Cancelar
                              </Button>
                            )}
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
