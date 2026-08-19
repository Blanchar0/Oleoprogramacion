import React, { useState } from 'react';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/src/components/ui';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../shared/supabase';

export default function Catalogs() {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();

  const [activeTab, setActiveTab] = useState<'users' | 'personnel' | 'activities' | 'equipment' | 'performances'>('personnel');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) return <div className="p-6 text-gray-500">Cargando catálogos de Supabase...</div>;

  const users = catalogs.users || [];
  const personnel = catalogs.personnel || [];
  const activities = catalogs.activities || [];
  const equipment = catalogs.equipment || [];
  const performances = catalogs.performanceReferences || [];

  const handleToggle = async (id: string, table: string, currentState: boolean) => {
    try {
      const { error } = await supabase.from(table).update({ active: !currentState }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("Error actualizando estado en Supabase");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Gestión de Catálogos</h2>
        <p className="text-gray-500 text-sm mt-1">Administración de datos maestros del sistema en Supabase</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={activeTab === 'users' ? 'primary' : 'outline'} onClick={() => setActiveTab('users')}>Usuarios ({users.length})</Button>
        <Button variant={activeTab === 'personnel' ? 'primary' : 'outline'} onClick={() => setActiveTab('personnel')}>Personal ({personnel.length})</Button>
        <Button variant={activeTab === 'activities' ? 'primary' : 'outline'} onClick={() => setActiveTab('activities')}>Actividades ({activities.length})</Button>
        <Button variant={activeTab === 'equipment' ? 'primary' : 'outline'} onClick={() => setActiveTab('equipment')}>Maquinaria ({equipment.length})</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="capitalize">{activeTab}</CardTitle>
            <Input 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                <tr>
                  <th className="px-4 py-3">Nombre / Identificador</th>
                  <th className="px-4 py-3">Detalle / Rol / Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'users' && users
                  .filter((u:any) => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((u:any) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">{u.name} <span className="text-xs text-gray-400">(@{u.username})</span></td>
                      <td className="px-4 py-3">{u.role} {u.idSupervisor ? `(${u.idSupervisor})` : ''}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleToggle(u.id, 'users', u.active)}>
                          {u.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'personnel' && personnel
                  .filter((p:any) => (p.name || p.nombreCompleto)?.toLowerCase().includes(searchTerm.toLowerCase()) || p.documento?.includes(searchTerm))
                  .map((p:any) => (
                    <tr key={p.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">{p.name || p.nombreCompleto} <span className="text-xs text-gray-400">(CC: {p.documento})</span></td>
                      <td className="px-4 py-3">{p.type || p.tipoPersonal} - {p.jobTitle || p.laborCargo} ({p.cuadrilla || p.actividadCuadrilla || 'S/C'})</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleToggle(p.id, 'personnel', p.active)}>
                          {p.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'activities' && activities
                  .filter((a:any) => a.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((a:any) => (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3">Unidad: {a.unit || 'JORNAL'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${a.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {a.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleToggle(a.id, 'activities', a.active)}>
                          {a.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'equipment' && equipment
                  .filter((e:any) => e.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((e:any) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">{e.name}</td>
                      <td className="px-4 py-3">{e.type || 'Maquinaria'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${e.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {e.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleToggle(e.id, 'equipment', e.active)}>
                          {e.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
