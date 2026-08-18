import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Play, Square } from 'lucide-react';

export default function Machinery() {
  const { user } = useAuth();
  const { catalogs, loading: catLoading } = useCatalogs();

  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [equipmentId, setEquipmentId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [implementId, setImplementId] = useState('');
  const [zone, setZone] = useState('');
  const [locationId, setLocationId] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [todaysMachinery, setTodaysMachinery] = useState<any[]>([]);

  useEffect(() => {
    const filters: any = { date };
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsub = repository.subscribeMachinery(filters, setTodaysMachinery);
    return () => unsub();
  }, [date, user]);

  const allPersonnel = catalogs.personnel.filter((p: any) => p.active);
  const tractors = catalogs.equipment.filter((e: any) => e.type === 'TRACTOR');
  const implementsData = catalogs.equipment.filter((e: any) => e.type === 'IMPLEMENTO');
  const zones = Array.from(new Set(catalogs.locations.map((l: any) => l.zone)));
  const lotes = zone ? catalogs.locations.filter((l: any) => l.zone === zone) : [];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId || !operatorId || !zone || !locationId) {
      setError('Complete los campos obligatorios');
      return;
    }
    setLoading(true);
    const payload = {
      date,
      equipmentId,
      operatorId,
      implementId: implementId || null,
      locationId,
      zoneSnapshot: `${zone} - ${lotes.find((l: any) => l.id === locationId)?.name}`,
      idSupervisor: user?.idSupervisor || null,
      status: 'EN_PROGRESO',
      startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
    const res = await repository.createMachineryOperation(payload);
    setLoading(false);
    if (res.ok) {
      setEquipmentId(''); setOperatorId(''); setImplementId('');
    } else {
      setError(res.error || 'Error al guardar');
    }
  };

  const handleStop = async (id: string, currentVersion: number) => {
    if (window.confirm('¿Detener operación?')) {
      await repository.updateMachineryOperation(id, {
        status: 'FINALIZADA',
        endTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }, currentVersion);
    }
  };

  const handleCancel = async (id: string, currentVersion: number) => {
    if (window.confirm('¿Cancelar operación?')) {
      await repository.updateMachineryOperation(id, { status: 'CANCELADA' }, currentVersion);
    }
  };

  if (catLoading) return <div>Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Maquinaria</h2>
        <p className="text-gray-500 text-sm mt-1">Control de operaciones mecanizadas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Nueva Operación</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStart} className="space-y-4">
              {error && <div className="text-sm text-negative bg-negative/10 p-2 rounded">{error}</div>}
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>Tractor / Equipo</Label>
                <Combobox
                  options={tractors.map((t: any) => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                  value={equipmentId} onChange={setEquipmentId} placeholder="Seleccione tractor..."
                />
              </div>
              <div>
                <Label>Operador</Label>
                <Combobox
                  options={allPersonnel.map((p: any) => ({ value: p.id, label: p.name }))}
                  value={operatorId} onChange={setOperatorId} placeholder="Seleccione operador..."
                />
              </div>
              <div>
                <Label>Implemento (Opcional)</Label>
                <Combobox
                  options={implementsData.map((t: any) => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                  value={implementId} onChange={setImplementId} placeholder="Seleccione implemento..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Zona</Label>
                  <Combobox
                    options={zones.map(z => ({ value: z as string, label: z as string }))}
                    value={zone} onChange={setZone} placeholder="Zona"
                  />
                </div>
                <div>
                  <Label>Lote</Label>
                  <Combobox
                    options={lotes.map((l: any) => ({ value: l.id, label: l.name }))}
                    value={locationId} onChange={setLocationId} placeholder="Lote" disabled={!zone}
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Play size={18} className="mr-2" /> Iniciar Operación
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operaciones del {date}</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysMachinery.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay operaciones registradas en esta fecha.</div>
            ) : (
              <div className="space-y-4">
                {todaysMachinery.map(m => {
                  const eq = catalogs.equipment.find((e: any) => e.id === m.equipmentId);
                  const op = catalogs.personnel.find((p: any) => p.id === m.operatorId);
                  return (
                    <div key={m.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-gray-50">
                      <div>
                        <div className="font-bold text-gray-900">{eq?.code} - {eq?.name}</div>
                        <div className="text-sm text-gray-600">Operador: {op?.name}</div>
                        <div className="text-xs text-gray-500 mt-1">Lugar: {m.zoneSnapshot}</div>
                        <div className="text-xs font-mono mt-1">Inicio: {m.startTime} {m.endTime && `| Fin: ${m.endTime}`}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={cn(
                          "px-2 py-1 text-xs rounded-full font-medium",
                          m.status === 'EN_PROGRESO' ? "bg-blue-100 text-blue-700" :
                            m.status === 'FINALIZADA' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {m.status.replace('_', ' ')}
                        </span>
                        {m.status === 'EN_PROGRESO' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleCancel(m.id, m.version)}>Cancelar</Button>
                            <Button size="sm" className="bg-gray-800 text-white" onClick={() => handleStop(m.id, m.version)}><Square size={14} className="mr-1" /> Detener</Button>
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
    </div>
  );
}
