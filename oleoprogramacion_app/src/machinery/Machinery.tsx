import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Play, Square, Tractor, Calendar } from 'lucide-react';

export default function Machinery() {
  const { user } = useAuth();
  const { catalogs, loading: catLoading } = useCatalogs();

  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [equipmentId, setEquipmentId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [observations, setObservations] = useState('');
  const [zone, setZone] = useState('');
  const [locationId, setLocationId] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [todaysMachinery, setTodaysMachinery] = useState<any[]>([]);

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

  const zones = Array.from(new Set((catalogs.locations || []).map((l: any) => l.zone))).sort((a: any, b: any) => String(a).localeCompare(String(b), 'es', { numeric: true }));
  const lotes = zone ? (catalogs.locations || []).filter((l: any) => l.zone === zone).sort((a: any, b: any) => a.name.localeCompare(b.name, 'es', { numeric: true })) : [];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId || !operatorId || !zone || !locationId) {
      setError('Complete los campos obligatorios');
      return;
    }
    setError('');
    setLoading(true);
    const payload = {
      date,
      equipmentId,
      operatorId,
      observations: observations || '',
      locationId,
      zoneSnapshot: `${zone} - ${lotes.find((l: any) => l.id === locationId)?.name || locationId}`,
      idSupervisor: user?.idSupervisor || 'SUP001',
      supervisorId: user?.idSupervisor || 'SUP001',
      status: 'EN_PROGRESO',
      startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
    const res = await repository.createMachineryOperation(payload);
    setLoading(false);
    if (res.ok) {
      setEquipmentId('');
      setOperatorId('');
      setObservations('');
      setZone('');
      setLocationId('');
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

  if (catLoading) return <div className="p-6 text-gray-500">Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Tractor className="w-6 h-6 text-forest-700" /> Maquinaria
          </h2>
          <p className="text-gray-500 text-sm mt-1">Control y seguimiento de operaciones mecanizadas</p>
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
          <Card className="lg:col-span-1 h-fit shadow-xs">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-bold text-gray-800">Nueva Operación</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleStart} className="space-y-4">
                {error && <div className="text-sm text-negative bg-negative/10 p-2.5 rounded-md">{error}</div>}
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                  <Label>Tractor / Equipo</Label>
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
                  <Label>Operador (Tractorista)</Label>
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
                  <Label htmlFor="machinery-obs">Observaciones (Opcional)</Label>
                  <Input
                    id="machinery-obs"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Notas u observaciones de la operación..."
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
                <Button type="submit" disabled={loading} className="w-full shadow-md font-bold">
                  <Play size={18} className="mr-2 fill-white" /> {loading ? 'Iniciando...' : 'Iniciar Operación'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Listado de Operaciones */}
        <Card className={cn(isDirectivo ? "col-span-1" : "lg:col-span-2", "shadow-xs")}>
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
              </div>
            ) : (
              <div className="space-y-3">
                {todaysMachinery.map(m => {
                  const eq = catalogs.equipment.find((e: any) => e.id === m.equipmentId);
                  const op = catalogs.personnel.find((p: any) => p.id === m.operatorId);
                  return (
                    <div key={m.id} className="border border-gray-200/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white hover:border-gray-300 transition-colors shadow-xs">
                      <div>
                        <div className="font-bold text-gray-900 text-base">
                          {eq?.code ? `${eq.code} - ${eq.name}` : (eq?.name || 'Equipo')}
                        </div>
                        <div className="text-xs text-gray-700 font-medium mt-0.5">Operador: <span className="text-gray-900">{op?.name || 'Sin asignar'}</span></div>
                        <div className="text-xs text-gray-500 mt-0.5">Ubicación: <span className="font-medium text-gray-700">{m.zoneSnapshot}</span></div>
                        {m.observations && (
                          <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200/60 mt-1 max-w-md">
                            <span className="font-semibold text-gray-700">Obs:</span> {m.observations}
                          </div>
                        )}
                        <div className="text-xs font-mono mt-1 text-gray-600 bg-gray-100 inline-block px-2 py-0.5 rounded">
                          Inicio: {m.startTime} {m.endTime && `| Fin: ${m.endTime}`}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-end gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
                        <span className={cn(
                          "px-2.5 py-1 text-xs rounded-full font-bold uppercase tracking-wider",
                          m.status === 'EN_PROGRESO' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            m.status === 'FINALIZADA' ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"
                        )}>
                          {m.status.replace('_', ' ')}
                        </span>
                        {!isDirectivo && m.status === 'EN_PROGRESO' && (
                          <div className="flex gap-2 mt-1">
                            <Button size="sm" variant="outline" className="text-red-700 border-2 border-red-300 hover:bg-red-50 text-xs h-7 px-2.5 font-bold" onClick={() => handleCancel(m.id, m.version)}>Cancelar</Button>
                            <Button size="sm" className="bg-forest-900 hover:bg-forest-950 text-white text-xs h-7 px-2.5 font-bold" onClick={() => handleStop(m.id, m.version)}><Square size={12} className="mr-1 fill-white" /> Detener</Button>
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
