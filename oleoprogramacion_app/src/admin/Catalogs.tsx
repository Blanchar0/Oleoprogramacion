import React, { useState } from 'react';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Label, Combobox, cn } from '@/src/components/ui';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../shared/supabase';
import { repository } from '../shared/AgronomicRepository';
import { Plus, Edit2, TrendingUp } from 'lucide-react';
import { isOperative } from '../dashboard/Dashboard';

export default function Catalogs() {
  const { user } = useAuth();
  const { catalogs, loading } = useCatalogs();

  const [activeTab, setActiveTab] = useState<'users' | 'personnel' | 'activities' | 'performance' | 'equipment'>('personnel');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null); // null means creating
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="p-6 text-gray-500">Cargando catálogos de Supabase...</div>;

  const users = [...(catalogs.users || [])].sort((a: any, b: any) => (a.name || a.username || '').localeCompare(b.name || b.username || '', 'es', { numeric: true }));
  const personnel = [...(catalogs.personnel || [])].sort((a: any, b: any) => (a.name || a.nombreCompleto || '').localeCompare(b.name || b.nombreCompleto || '', 'es', { numeric: true }));
  const activities = [...(catalogs.activities || [])].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true }));
  const equipment = [...(catalogs.equipment || [])].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true }));
  const labors = [...(catalogs.labors || [])].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true }));
  
  const performanceReferences = [...(catalogs.performanceReferences || [])].sort((a: any, b: any) => {
    const actA = activities.find(act => act.id === (a.activityId || a.activity_id))?.name || '';
    const actB = activities.find(act => act.id === (b.activityId || b.activity_id))?.name || '';
    return actA.localeCompare(actB, 'es', { numeric: true });
  });

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
      if (activeTab === 'performance') {
        setFormData({ 
          active: true, 
          performancePerPersonDay: 1, 
          unit: 'Jornal',
          source: 'MANUAL' 
        });
      } else {
        setFormData({ active: true });
      }
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
    } else if (activeTab === 'performance') {
      if (editingRecord) res = await repository.updatePerformanceReference(editingRecord.id, formData);
      else res = await repository.createPerformanceReference(formData);
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
        <p className="text-gray-500 text-sm mt-1">Administración de datos maestros y parámetros del sistema en Supabase</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={activeTab === 'users' ? 'primary' : 'outline'} onClick={() => setActiveTab('users')}>Usuarios ({users.length})</Button>
        <Button variant={activeTab === 'personnel' ? 'primary' : 'outline'} onClick={() => setActiveTab('personnel')}>Personal ({personnel.length})</Button>
        <Button variant={activeTab === 'activities' ? 'primary' : 'outline'} onClick={() => setActiveTab('activities')}>Actividades ({activities.length})</Button>
        <Button variant={activeTab === 'performance' ? 'primary' : 'outline'} onClick={() => setActiveTab('performance')} className={cn(activeTab === 'performance' && "font-bold shadow-xs")}>
          <TrendingUp size={15} className="mr-1.5" /> Rendimiento ({performanceReferences.length})
        </Button>
        <Button variant={activeTab === 'equipment' ? 'primary' : 'outline'} onClick={() => setActiveTab('equipment')}>Maquinaria ({equipment.length})</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="capitalize">
              {activeTab === 'performance' ? 'Referencias de Rendimiento por Actividad' : activeTab}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={() => openModal()} className="flex items-center gap-1.5 shadow-sm font-bold bg-forest-900 hover:bg-forest-950 text-white">
                <Plus size={16} /> Agregar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 bg-gray-50 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">{activeTab === 'performance' ? 'Actividad / Labor' : 'Nombre / Identificador'}</th>
                  <th className="px-4 py-3">{activeTab === 'performance' ? 'Rendimiento Base (Por persona/día)' : 'Detalle / Rol / Tipo'}</th>
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
                        <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${u.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                          {u.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openModal(u)} className="mr-1 text-forest-900 hover:text-forest-950 hover:bg-forest-100 h-8 w-8 p-0" title="Editar">
                          <Edit2 size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleToggle(u.id, 'users', u.active)}
                          className={cn("text-xs h-8 px-2.5 font-bold", u.active ? "text-red-700 border-2 border-red-300 hover:bg-red-50" : "text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-50")}
                        >
                          {u.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'personnel' && personnel
                  .filter((p:any) => (p.name || p.nombreCompleto)?.toLowerCase().includes(searchTerm.toLowerCase()) || p.documento?.includes(searchTerm))
                  .map((p:any) => {
                    const isAdmin = (p.tipoPersonal || p.tipo_personal || p.type || '').toUpperCase() === 'ADMINISTRATIVO' || !isOperative(p);
                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium">
                          {p.name || p.nombreCompleto} 
                          <span className="text-xs text-gray-400 block font-normal">CC: {p.documento}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                              isAdmin ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {isAdmin ? 'ADMINISTRATIVO' : 'CAMPO'}
                            </span>
                            <span className="text-xs text-gray-600">{p.jobTitle || p.laborCargo || 'Sin cargo'} ({p.cuadrilla || p.actividadCuadrilla || 'S/C'})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${p.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            {p.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openModal(p)} className="mr-1 text-forest-900 hover:text-forest-950 hover:bg-forest-100 h-8 w-8 p-0" title="Editar">
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleToggle(p.id, 'personnel', p.active)}
                            className={cn("text-xs h-8 px-2.5 font-bold", p.active ? "text-red-700 border-2 border-red-300 hover:bg-red-50" : "text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-50")}
                          >
                            {p.active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                {activeTab === 'activities' && activities
                  .filter((a:any) => a.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((a:any) => {
                    const labor = labors.find(l => l.id === (a.laborId || a.labor_id));
                    return (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium">
                          {a.name}
                          {labor && <span className="text-xs text-gray-400 block font-normal">Labor: {labor.name}</span>}
                        </td>
                        <td className="px-4 py-3">Unidad: <span className="font-semibold text-gray-800">{a.unit || 'JORNAL'}</span></td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${a.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            {a.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openModal(a)} className="mr-1 text-forest-900 hover:text-forest-950 hover:bg-forest-100 h-8 w-8 p-0" title="Editar">
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleToggle(a.id, 'activities', a.active)}
                            className={cn("text-xs h-8 px-2.5 font-bold", a.active ? "text-red-700 border-2 border-red-300 hover:bg-red-50" : "text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-50")}
                          >
                            {a.active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                {/* Rendimientos / Performance References */}
                {activeTab === 'performance' && performanceReferences
                  .filter((pr: any) => {
                    const act = activities.find(a => a.id === (pr.activityId || pr.activity_id));
                    const lab = labors.find(l => l.id === (act?.laborId || act?.labor_id));
                    const term = searchTerm.toLowerCase();
                    return (
                      act?.name?.toLowerCase().includes(term) ||
                      lab?.name?.toLowerCase().includes(term) ||
                      pr.unit?.toLowerCase().includes(term) ||
                      String(pr.performancePerPersonDay || pr.performance_per_person_day).includes(term)
                    );
                  })
                  .map((pr: any) => {
                    const act = activities.find(a => a.id === (pr.activityId || pr.activity_id));
                    const lab = labors.find(l => l.id === (act?.laborId || act?.labor_id));
                    const perfVal = pr.performancePerPersonDay !== undefined ? pr.performancePerPersonDay : pr.performance_per_person_day;

                    return (
                      <tr key={pr.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-gray-900 block">{act?.name || 'Actividad no asignada'}</span>
                          {lab?.name && <span className="text-xs text-forest-800 font-medium block">Labor: {lab.name}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-forest-950 bg-forest-50 border border-forest-200 px-2.5 py-0.5 rounded-lg">
                              {perfVal}
                            </span>
                            <span className="text-xs font-semibold text-gray-600">
                              {pr.unit || act?.unit || 'Jornal'} / persona / día
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${pr.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            {pr.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openModal(pr)} className="mr-1 text-forest-900 hover:text-forest-950 hover:bg-forest-100 h-8 w-8 p-0" title="Editar rendimiento">
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleToggle(pr.id, 'performance_references', pr.active)}
                            className={cn("text-xs h-8 px-2.5 font-bold", pr.active ? "text-red-700 border-2 border-red-300 hover:bg-red-50" : "text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-50")}
                          >
                            {pr.active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                {activeTab === 'equipment' && equipment
                  .filter((e:any) => e.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((e:any) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">{e.name}</td>
                      <td className="px-4 py-3">{e.type || 'Maquinaria'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${e.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                          {e.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openModal(e)} className="mr-1 text-forest-900 hover:text-forest-950 hover:bg-forest-100 h-8 w-8 p-0" title="Editar">
                          <Edit2 size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleToggle(e.id, 'equipment', e.active)}
                          className={cn("text-xs h-8 px-2.5 font-bold", e.active ? "text-red-700 border-2 border-red-300 hover:bg-red-50" : "text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-50")}
                        >
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
            <DialogTitle>
              {editingRecord ? 'Editar' : 'Agregar'} {activeTab === 'performance' ? 'Rendimiento de Actividad' : activeTab}
            </DialogTitle>
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
                <div><Label>Nombre Completo</Label><Input required value={formData.name || formData.nombreCompleto || ''} onChange={e => setFormData({...formData, name: e.target.value, nombreCompleto: e.target.value})} /></div>
                <div><Label>Documento (C.C.)</Label><Input required value={formData.documento || ''} onChange={e => setFormData({...formData, documento: e.target.value})} /></div>
                <div>
                  <Label>Clasificación / Área</Label>
                  <Combobox 
                    options={[
                      { value: 'CAMPO', label: 'CAMPO (Operativo / Productivo)' },
                      { value: 'ADMINISTRATIVO', label: 'ADMINISTRATIVO (Oficina / Supervisor / Directivo)' }
                    ]} 
                    value={formData.tipoPersonal || formData.type || 'CAMPO'} 
                    onChange={v => setFormData({...formData, tipoPersonal: v, type: v})} 
                    placeholder="Seleccione Área"
                  />
                </div>
                <div><Label>Cargo / Función</Label><Input value={formData.jobTitle || formData.laborCargo || ''} onChange={e => setFormData({...formData, jobTitle: e.target.value, laborCargo: e.target.value})} placeholder="Ej: Administrador, Supervisor, Cosechero, etc." /></div>
                <div><Label>Cuadrilla / Zona</Label><Input value={formData.cuadrilla || formData.actividadCuadrilla || ''} onChange={e => setFormData({...formData, cuadrilla: e.target.value})} placeholder="Opcional" /></div>
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

            {activeTab === 'performance' && (
              <>
                <div>
                  <Label>Actividad *</Label>
                  <Combobox 
                    options={activities.map((a: any) => {
                      const lab = labors.find(l => l.id === (a.laborId || a.labor_id));
                      return {
                        value: a.id,
                        label: a.name,
                        description: lab ? `Labor: ${lab.name}` : undefined
                      };
                    })}
                    value={formData.activityId || formData.activity_id || ''}
                    onChange={(v) => {
                      const selectedAct = activities.find(a => a.id === v);
                      setFormData({
                        ...formData,
                        activityId: v,
                        activity_id: v,
                        unit: formData.unit || selectedAct?.unit || 'Jornal'
                      });
                    }}
                    placeholder="Seleccione Actividad..."
                  />
                </div>
                <div>
                  <Label>Rendimiento por Persona / Día *</Label>
                  <Input 
                    type="number" 
                    step="any"
                    min="0"
                    required 
                    value={formData.performancePerPersonDay !== undefined ? formData.performancePerPersonDay : (formData.performance_per_person_day !== undefined ? formData.performance_per_person_day : 1)} 
                    onChange={e => setFormData({
                      ...formData, 
                      performancePerPersonDay: parseFloat(e.target.value),
                      performance_per_person_day: parseFloat(e.target.value)
                    })} 
                    placeholder="Ej: 1, 2.3, 900, etc."
                  />
                </div>
                <div>
                  <Label>Unidad de Medida *</Label>
                  <Input 
                    required 
                    value={formData.unit || ''} 
                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                    placeholder="Ej: Jornal, Palma, Ha, Ton, Kg" 
                  />
                </div>
                <div className="p-3 bg-forest-50/80 rounded-xl border border-forest-200 text-xs text-forest-900">
                  <p className="font-semibold">💡 Impacto en Supervisores</p>
                  <p className="mt-0.5 text-gray-600">
                    Este valor será cargado automáticamente por defecto a los supervisores al programar esta actividad en campo.
                  </p>
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
              <Button type="submit" disabled={saving} className="bg-forest-900 hover:bg-forest-950 text-white font-bold">
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
