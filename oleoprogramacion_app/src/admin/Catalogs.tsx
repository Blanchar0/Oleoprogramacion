import React, { useState } from 'react';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Label, Combobox } from '@/src/components/ui';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../shared/supabase';
import { repository } from '../shared/AgronomicRepository';
import { Plus, Edit2 } from 'lucide-react';

export default function Catalogs() {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();

  const [activeTab, setActiveTab] = useState<'users' | 'personnel' | 'activities' | 'equipment'>('personnel');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null); // null means creating
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="p-6 text-gray-500">Cargando catálogos de Supabase...</div>;

  const users = catalogs.users || [];
  const personnel = catalogs.personnel || [];
  const activities = catalogs.activities || [];
  const equipment = catalogs.equipment || [];
  const labors = catalogs.labors || [];

  const handleToggle = async (id: string, table: string, currentState: boolean) => {
    try {
      const { error } = await supabase.from(table).update({ active: !currentState }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("Error actualizando estado en Supabase");
    }
  };

  const openModal = (record?: any) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      setFormData({ active: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;
    
    if (activeTab === 'users') {
      if (editingRecord) res = await repository.updateUser(editingRecord.id, formData);
      else res = await repository.createUser(formData);
    } else if (activeTab === 'personnel') {
      if (editingRecord) res = await repository.updatePersonnel(editingRecord.id, formData);
      else res = await repository.createPersonnel(formData);
    } else if (activeTab === 'activities') {
      if (editingRecord) res = await repository.updateActivity(editingRecord.id, formData);
      else res = await repository.createActivity(formData);
    } else if (activeTab === 'equipment') {
      if (editingRecord) res = await repository.updateEquipment(editingRecord.id, formData);
      else res = await repository.createEquipment(formData);
    }

    setSaving(false);
    if (res?.ok) {
      closeModal();
    } else {
      alert("Error guardando: " + (res?.error || 'Desconocido'));
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
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={() => openModal()} className="flex items-center gap-1">
                <Plus size={16} /> Agregar
              </Button>
            </div>
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
                  <th className="px-4 py-3 text-right">Acciones</th>
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
                        <Button size="sm" variant="ghost" onClick={() => openModal(u)} className="mr-1 text-primary">
                          <Edit2 size={16} />
                        </Button>
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
                        <Button size="sm" variant="ghost" onClick={() => openModal(p)} className="mr-1 text-primary">
                          <Edit2 size={16} />
                        </Button>
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
                        <Button size="sm" variant="ghost" onClick={() => openModal(a)} className="mr-1 text-primary">
                          <Edit2 size={16} />
                        </Button>
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
                        <Button size="sm" variant="ghost" onClick={() => openModal(e)} className="mr-1 text-primary">
                          <Edit2 size={16} />
                        </Button>
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

      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar' : 'Agregar'} {activeTab}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            
            {activeTab === 'users' && (
              <>
                <div><Label>Nombre</Label><Input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><Label>Username</Label><Input required value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                {!editingRecord && (
                  <div><Label>Contraseña</Label><Input type="password" required value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                )}
                <div>
                  <Label>Rol</Label>
                  <Combobox 
                    options={[{value:'ADMIN', label:'ADMIN'}, {value:'DIRECTIVO', label:'DIRECTIVO'}, {value:'SUPERVISOR', label:'SUPERVISOR'}]} 
                    value={formData.role || ''} 
                    onChange={v => setFormData({...formData, role: v})} 
                    placeholder="Seleccione rol"
                  />
                </div>
                {formData.role === 'SUPERVISOR' && (
                  <div><Label>ID Supervisor (Opcional)</Label><Input value={formData.idSupervisor || ''} onChange={e => setFormData({...formData, idSupervisor: e.target.value})} /></div>
                )}
              </>
            )}

            {activeTab === 'personnel' && (
              <>
                <div><Label>Nombre Completo</Label><Input required value={formData.name || formData.nombreCompleto || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><Label>Documento (C.C.)</Label><Input required value={formData.documento || ''} onChange={e => setFormData({...formData, documento: e.target.value})} /></div>
                <div><Label>Tipo</Label><Input value={formData.type || formData.tipoPersonal || ''} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="Ej: Obrero" /></div>
                <div><Label>Cargo</Label><Input value={formData.jobTitle || formData.laborCargo || ''} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="Ej: Cosechero" /></div>
                <div><Label>Cuadrilla</Label><Input value={formData.cuadrilla || formData.actividadCuadrilla || ''} onChange={e => setFormData({...formData, cuadrilla: e.target.value})} placeholder="Opcional" /></div>
              </>
            )}

            {activeTab === 'activities' && (
              <>
                <div><Label>Nombre de la Actividad</Label><Input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><Label>Unidad</Label><Input required value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="Ej: Jornal, Ton" /></div>
                <div>
                  <Label>Labor (Padre)</Label>
                  <Combobox 
                    options={labors.map((l:any) => ({value: l.id, label: l.name}))} 
                    value={formData.laborId || formData.labor_id || ''} 
                    onChange={v => setFormData({...formData, laborId: v})} 
                    placeholder="Seleccione Labor"
                  />
                </div>
              </>
            )}

            {activeTab === 'equipment' && (
              <>
                <div><Label>Nombre/Placa</Label><Input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><Label>Tipo</Label><Input value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="Ej: Tractor" /></div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
