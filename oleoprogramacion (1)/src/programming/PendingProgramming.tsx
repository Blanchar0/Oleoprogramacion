import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/src/components/ui';
import { Check, X, AlertCircle } from 'lucide-react';

export default function PendingProgramming() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { catalogs, loading: catLoading } = useCatalogs();

  const [pending, setPending] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.idSupervisor) {
      const unsub = repository.subscribeProgramming({ supervisorId: user.idSupervisor }, (data) => {
        const found = data.find(p => p.status === 'PENDIENTE');
        setPending(found || null);
        setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleAction = async (status: 'CONFIRMADA' | 'RECHAZADA') => {
    if (!pending) return;
    setActionLoading(true);
    const res = await repository.updateProgramming(pending.id, { status }, pending.version);
    setActionLoading(false);
    if (res.ok) {
      navigate('/');
    } else {
      setError(res.error || 'Error al actualizar');
    }
  };

  if (loading || catLoading) return <div>Cargando...</div>;

  if (!pending) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="text-gray-400 w-8 h-8" />
        </div>
        <h2 className="text-xl font-medium text-gray-900 mb-2">No tienes programaciones pendientes</h2>
        <p className="text-gray-500 mb-6">Todas tus programaciones han sido confirmadas o rechazadas.</p>
        <Button onClick={() => navigate('/programming/new')}>Crear Nueva Programación</Button>
      </div>
    );
  }

  const labor = catalogs.labors.find((l:any) => l.id === pending.laborId);
  const activity = catalogs.activities.find((a:any) => a.id === pending.activityId);
  const location = catalogs.locations.find((l:any) => l.id === pending.locationId);
  const personnelList = catalogs.personnel.filter((p:any) => (pending.personnelIds || []).includes(p.id));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Revisión de Programación</h2>
        <p className="text-gray-500 text-sm mt-1">Confirma o rechaza la asignación pendiente</p>
      </div>

      {error && (
        <div className="bg-negative/10 border border-negative text-negative px-4 py-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Fecha de Programación</span>
            <span className="font-semibold text-text-main">{pending.date}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Labor</div>
              <div className="font-medium">{labor?.name || 'Desconocida'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Actividad</div>
              <div className="font-medium">{activity?.name || 'Desconocida'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Zona - Lote</div>
              <div className="font-medium">{pending.zoneSnapshot || location?.zone}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Cantidad de Personal</div>
              <div className="font-medium text-xl">{(pending.personnelIds || []).length} <span className="text-sm font-normal text-gray-500">personas</span></div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500 mb-2">Personal Asignado</div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto">
              <ul className="space-y-2 text-sm">
                {personnelList.map((p:any) => (
                  <li key={p.id} className="flex justify-between border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                    <span>{p.name}</span>
                    <span className="text-gray-500">{p.jobTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {pending.observations && (
            <div>
              <div className="text-sm text-gray-500 mb-1">Observaciones</div>
              <div className="text-sm p-3 bg-gray-50 rounded-md border border-gray-100">
                {pending.observations}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
            <Button 
              variant="outline" 
              className="flex-1 border-negative text-negative hover:bg-negative hover:text-white"
              onClick={() => handleAction('RECHAZADA')}
              disabled={actionLoading}
            >
              <X size={18} className="mr-2" />
              Rechazar
            </Button>
            <Button 
              variant="primary" 
              className="flex-1"
              onClick={() => handleAction('CONFIRMADA')}
              disabled={actionLoading}
            >
              <Check size={18} className="mr-2" />
              Confirmar Programación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
