import React, { useState } from 'react';
import { useCatalogs } from '../shared/useCatalogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Label, Combobox } from '@/src/components/ui';
import { repository } from '../shared/AgronomicRepository';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Novedad } from '../types';

export default function Novedades() {
  const { catalogs, loading } = useCatalogs();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Novedad | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="p-6 text-gray-500">Cargando novedades...</div>;

  const novedades = catalogs.personnelNovelties || [];
  const personnel = catalogs.personnel || [];
  const activePersonnel = personnel.filter(p => p.active);

  // Sorting newest first
  const sortedNovedades = [...novedades].sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

  const openModal = (record?: Novedad) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      setFormData({
        tipo: 'VACACIONES',
        fechaInicio: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
        fechaFin: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
      });
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

    // ensure personaNombreFuente is mapped
    const person = personnel.find(p => p.documento === formData.personaDocumento);
    if (person) {
      formData.personaNombreFuente = person.name || person.nombreCompleto;
    }

    if (editingRecord) {
      res = await repository.updateNovedad(editingRecord.id, formData);
    } else {
      res = await repository.createNovedad(formData);
    }

    setSaving(false);
    if (res?.ok) {
      closeModal();
    } else {
      alert("Error guardando novedad: " + (res?.error || 'Desconocido'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta novedad?')) {
      const res = await repository.deleteNovedad(id);
      if (!res?.ok) {
        alert("Error eliminando novedad: " + (res?.error || 'Desconocido'));
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Novedades de Personal</h2>
        <p className="text-gray-500 text-sm mt-1">Gestión de ausencias prolongadas (Incapacidades, Vacaciones, Licencias)</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Novedades</CardTitle>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Buscar empleado..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={() => openModal()} className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white">
                <Plus size={16} /> Registrar Novedad
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                <tr>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Desde</th>
                  <th className="px-4 py-3">Hasta</th>
                  <th className="px-4 py-3">Estado actual</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedNovedades
                  .filter((n:any) => n.personaNombreFuente?.toLowerCase().includes(searchTerm.toLowerCase()) || n.personaDocumento?.includes(searchTerm))
                  .map((n:any) => {
                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
                    const isActiveNow = n.fechaInicio <= today && n.fechaFin >= today;
                    const isPast = n.fechaFin < today;
                    const isFuture = n.fechaInicio > today;

                    return (
                    <tr key={n.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">
                        {n.personaNombreFuente} <span className="text-xs text-gray-400">({n.personaDocumento})</span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{n.tipo}</td>
                      <td className="px-4 py-3">{n.fechaInicio}</td>
                      <td className="px-4 py-3">{n.fechaFin}</td>
                      <td className="px-4 py-3">
                        {isActiveNow && <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">En curso</span>}
                        {isPast && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Finalizada</span>}
                        {isFuture && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Programada</span>}
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openModal(n)} className="text-primary h-8 w-8 p-0">
                          <Edit2 size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(n.id)} className="text-red-500 h-8 w-8 p-0">
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  )})}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar' : 'Registrar'} Novedad</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            
            <div>
              <Label>Empleado</Label>
              <Combobox 
                options={activePersonnel.map((p:any) => ({ value: p.documento, label: `${p.name || p.nombreCompleto} (${p.documento})` }))}
                value={formData.personaDocumento || ''}
                onChange={v => setFormData({...formData, personaDocumento: v})}
                placeholder="Seleccione empleado"
              />
            </div>

            <div>
              <Label>Tipo de Novedad</Label>
              <Combobox 
                options={[
                  { value: 'VACACIONES', label: 'Vacaciones' },
                  { value: 'INCAPACIDAD', label: 'Incapacidad' },
                  { value: 'LICENCIA', label: 'Licencia' },
                  { value: 'SUSPENSION', label: 'Suspensión' },
                  { value: 'PERMISO NO REMUNERADO', label: 'Permiso No Remunerado' },
                ]}
                value={formData.tipo || ''}
                onChange={v => setFormData({...formData, tipo: v})}
                placeholder="Seleccione tipo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Inicio</Label>
                <Input type="date" required value={formData.fechaInicio || ''} onChange={e => setFormData({...formData, fechaInicio: e.target.value})} />
              </div>
              <div>
                <Label>Fecha Fin (Último día de novedad)</Label>
                <Input type="date" required value={formData.fechaFin || ''} onChange={e => setFormData({...formData, fechaFin: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
              <Button type="submit" disabled={saving || !formData.personaDocumento || !formData.tipo || !formData.fechaInicio || !formData.fechaFin}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
