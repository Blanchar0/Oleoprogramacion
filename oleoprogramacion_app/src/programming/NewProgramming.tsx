import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, Button, Input, Label, cn } from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Labor, Activity, Location, Personnel, Novedad, VoiceExtraction, ProgrammingPerformance, ActivityPerformanceReference, ResolvedField } from '../types';
import { Mic, MicOff, Square, RefreshCcw, Check, X, AlertCircle, Play, Pause, FileText, CheckCircle2, CalendarPlus } from 'lucide-react';
import { resolveVoiceData } from './voiceResolver';
import { isOperative } from '../dashboard/Dashboard';

type VoiceState = 
  | 'LISTO' 
  | 'SOLICITANDO_PERMISO' 
  | 'GRABANDO' 
  | 'ENVIANDO_AUDIO' 
  | 'TRANSCRIBIENDO' 
  | 'INTERPRETANDO' 
  | 'RESOLVIENDO_CATALOGOS' 
  | 'BORRADOR_LISTO' 
  | 'ERROR_RECUPERABLE';

export default function NewProgramming() {
  const { catalogs, loading: catLoading } = useCatalogs();
  const [programmings, setProgrammings] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [absences, setAbsences] = useState<any[]>([]);
  const cloneTemplate = location.state?.cloneTemplate;
  const editRecord = location.state?.editRecord;
  const isEditing = !!editRecord;
  
  // Data - Sorted alphabetically A to Z (Excluding MAQUINARIA since it has its dedicated module)
  const labors = (catalogs.labors || [])
    .filter(l => l.active && l.name.toUpperCase().trim() !== 'MAQUINARIA')
    .sort((a,b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  const allActivities = (catalogs.activities || []).filter(a => a.active).sort((a,b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  const locations = (catalogs.locations || []).filter(l => l.active).sort((a,b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  const allPersonnel = (catalogs.personnel || []).filter(p => p.active && isOperative(p)).sort((a,b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  const allNovedades = (catalogs.personnelNovelties || []) || [];
  
  const zones = Array.from(new Set(locations.map(l => l.zone))).sort((a,b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
  
  const getNextDateString = (dateStr?: string): string => {
    if (!dateStr) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  };

  // State: Form (Manual)
  const [method, setMethod] = useState<'form' | 'voice'>('form');
  const [date, setDate] = useState(() => {
    if (editRecord?.date) return editRecord.date;
    if (cloneTemplate?.date) return getNextDateString(cloneTemplate.date);
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  });
  
  const [laborId, setLaborId] = useState(editRecord?.laborId || cloneTemplate?.laborId || '');
  const [activityId, setActivityId] = useState(editRecord?.activityId || cloneTemplate?.activityId || '');
  const [zone, setZone] = useState(editRecord?.zoneSnapshot?.split(' - ')[0] || cloneTemplate?.zoneSnapshot?.split(' - ')[0] || '');
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>(() => {
    if (editRecord?.locationIds?.length) return editRecord.locationIds;
    if (editRecord?.locationId) return String(editRecord.locationId).split(',').map((s: string) => s.trim()).filter(Boolean);
    if (cloneTemplate?.locationIds?.length) return cloneTemplate.locationIds;
    if (cloneTemplate?.locationId) return String(cloneTemplate.locationId).split(',').map((s: string) => s.trim()).filter(Boolean);
    return [];
  });
  const [loteSearchTerm, setLoteSearchTerm] = useState('');

  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>(editRecord?.personnelIds || cloneTemplate?.personnelIds || []);
  const [observations, setObservations] = useState(editRecord?.observations || cloneTemplate?.observations || '');

  // Effect to sync all fields once catalogs arrive or when template/editRecord changes
  useEffect(() => {
    const source = editRecord || cloneTemplate;
    if (!source) return;

    // Date
    if (editRecord?.date) {
      setDate(editRecord.date);
    } else if (cloneTemplate?.date) {
      setDate(getNextDateString(cloneTemplate.date));
    }

    // Labor and Activity
    let lId = source.laborId || '';
    let aId = source.activityId || '';
    if (aId && catalogs.activities?.length) {
      const act = catalogs.activities.find((a: any) => a.id === aId);
      if (act && !lId) {
        lId = act.laborId || act.labor_id;
      }
    }
    if (lId) setLaborId(lId);
    if (aId) setActivityId(aId);

    // Zone and Locations (Lotes)
    let z = '';
    let locIds: string[] = [];

    if (source.locationIds && Array.isArray(source.locationIds) && source.locationIds.length > 0) {
      locIds = source.locationIds;
    } else if (source.locationId) {
      locIds = String(source.locationId).split(',').map(s => s.trim()).filter(Boolean);
    }

    if (locIds.length > 0 && catalogs.locations?.length) {
      const firstLoc = catalogs.locations.find((l: any) => l.id === locIds[0]);
      if (firstLoc) z = firstLoc.zone;
    }

    if (!z && source.zoneSnapshot) {
      if (source.zoneSnapshot.includes(' - ')) {
        const [zonePart, lotesPart] = source.zoneSnapshot.split(' - ');
        z = zonePart.trim();
        if (locIds.length === 0 && lotesPart && catalogs.locations?.length) {
          const names = lotesPart.split(',').map((s: string) => s.trim());
          const found = catalogs.locations.filter((l: any) => names.includes(l.name) || names.includes(l.code));
          if (found.length > 0) {
            locIds = found.map((l: any) => l.id);
          }
        }
      } else if (catalogs.locations?.length) {
        const locByCodeOrName = catalogs.locations.find((l: any) => 
          l.name === source.zoneSnapshot || l.code === source.zoneSnapshot || l.id === source.zoneSnapshot
        );
        if (locByCodeOrName) {
          z = locByCodeOrName.zone;
          if (locIds.length === 0) locIds = [locByCodeOrName.id];
        } else {
          const matchingZone = zones.find(zn => String(zn) === source.zoneSnapshot);
          if (matchingZone) z = String(matchingZone);
        }
      }
    }

    if (z) setZone(z);
    if (locIds.length > 0) setSelectedLocations(locIds);

    // Selected Personnel
    if (source.personnelIds && Array.isArray(source.personnelIds) && source.personnelIds.length > 0) {
      setSelectedPersonnel(source.personnelIds);
    }

    // Observations
    if (source.observations !== undefined && source.observations !== null) {
      setObservations(source.observations || '');
    }

    // Performance
    if (source.performancePerPerson !== undefined && source.performancePerPerson !== null) {
      const numPeople = (source.personnelIds || []).length;
      const perfVal = parseFloat(source.performancePerPerson);
      setPerformance({
        unit: source.unit || 'Sin referencia',
        referencePerformancePerPersonDay: perfVal,
        performancePerPersonDay: perfVal,
        plannedQuantity: source.expectedTotalQuantity !== undefined && source.expectedTotalQuantity !== null
          ? parseFloat(source.expectedTotalQuantity)
          : perfVal * numPeople,
        wasManuallyEdited: true
      });
    }
  }, [catalogs, cloneTemplate, editRecord]);
  
  useEffect(() => {
    const filters: any = { date };
    if (user?.role === 'SUPERVISOR') filters.supervisorId = user.idSupervisor;
    const unsub1 = repository.subscribeProgramming(filters, setProgrammings);
    const unsub2 = repository.subscribeMachinery(filters, setMachineries);
    const unsub3 = repository.subscribeAbsences(filters, setAbsences);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [date, user]);

  const [performance, setPerformance] = useState<ProgrammingPerformance>({
    unit: 'Sin referencia',
    referencePerformancePerPersonDay: null,
    performancePerPersonDay: null,
    plannedQuantity: null,
    wasManuallyEdited: false
  });
  const [isEditingPerformance, setIsEditingPerformance] = useState(false);
  
  // Update performance when activity or personnel changes
  useEffect(() => {
    const refs = (catalogs.performanceReferences || []) as any[];
    const ref = refs.find(r => r.activityId === activityId && r.active);
    const act = (catalogs.activities || []).find((a:any) => a.id === activityId);
    
    const uniquePersonnelCount = new Set(selectedPersonnel).size;

    setPerformance(prev => {
      const newUnit = act ? act.unit : 'Sin referencia';
      
      // If activity changed, we must reset
      if (prev.referencePerformancePerPersonDay !== (ref ? ref.performancePerPersonDay : null) || prev.unit !== newUnit) {
        if (!ref) {
           return {
             unit: newUnit,
             referencePerformancePerPersonDay: null,
             performancePerPersonDay: prev.wasManuallyEdited ? prev.performancePerPersonDay : null,
             plannedQuantity: prev.wasManuallyEdited && prev.performancePerPersonDay !== null ? prev.performancePerPersonDay * uniquePersonnelCount : null,
             wasManuallyEdited: prev.wasManuallyEdited
           };
        }
        return {
          unit: newUnit,
          referencePerformancePerPersonDay: ref.performancePerPersonDay,
          performancePerPersonDay: prev.wasManuallyEdited && prev.performancePerPersonDay !== null ? prev.performancePerPersonDay : ref.performancePerPersonDay,
          plannedQuantity: (prev.wasManuallyEdited && prev.performancePerPersonDay !== null ? prev.performancePerPersonDay : ref.performancePerPersonDay) * uniquePersonnelCount,
          wasManuallyEdited: prev.wasManuallyEdited
        };
      }
      
      // If activity didn't change but personnel did, and NOT manually edited
      if (ref && !prev.wasManuallyEdited) {
         return {
           ...prev,
           plannedQuantity: prev.performancePerPersonDay! * uniquePersonnelCount
         };
      }
      
      // If manually edited, we just update the total based on the manual performance * count
      if (prev.wasManuallyEdited && prev.performancePerPersonDay !== null) {
          return {
              ...prev,
              plannedQuantity: prev.performancePerPersonDay * uniquePersonnelCount
          };
      }
      
      return prev;
    });
  }, [activityId, selectedPersonnel]);

  
  const activities = laborId ? allActivities.filter(a => a.laborId === laborId) : [];
  const lotes = zone ? locations.filter(l => l.zone === zone).sort((a,b) => a.name.localeCompare(b.name, 'es', { numeric: true })) : [];
  const filteredLotes = lotes.filter(l => l.name.toLowerCase().includes(loteSearchTerm.toLowerCase()));

  const toggleLocation = (id: string) => {
    setSelectedLocations(prev =>
      prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]
    );
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictAbsences, setConflictAbsences] = useState<any[]>([]);

  // State: Voice
  const [voiceState, setVoiceState] = useState<VoiceState>('LISTO');
  const [voiceError, setVoiceError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [draftResult, setDraftResult] = useState<any>(null); // resolved fields

  // Refs for voice
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Check pending
  useEffect(() => {
    if (user?.supervisorId) {
      const hasPending = programmings.some(p => p.supervisorId === user.supervisorId && p.status === 'PENDIENTE');
      if (hasPending) {
        navigate('/programming/pending');
      }
    }
  }, [user, navigate]);

  // Update dependencies
  useEffect(() => {
    if (laborId) {
      const currentValid = (catalogs.activities || []).find(a => a.active && a.id === activityId && a.laborId === laborId);
      if (!currentValid && activityId !== '') {
        setActivityId(''); 
      }
    } else {
      if (activityId !== '') setActivityId('');
    }
  }, [laborId]);

  useEffect(() => {
    if (zone) {
      const validLoteIds = locations.filter(l => l.zone === zone).map(l => l.id);
      setSelectedLocations(prev => prev.filter(id => validLoteIds.includes(id)));
    } else {
      setSelectedLocations([]);
    }
  }, [zone]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    audioBlobRef.current = null;
    audioChunksRef.current = [];
    setIsPlaying(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioBlobRef.current = audioBlob;
        audioUrlRef.current = URL.createObjectURL(audioBlob);
        setVoiceState('CONFIRMACION_REPRODUCCION');
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
      setVoiceState('GRABANDO');
      setRecordingTime(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setVoiceState('ERROR_RECUPERABLE');
      setVoiceError('No se pudo acceder al micrófono. Por favor verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const retryRecording = () => {
    cleanupAudio();
    startRecording();
  };

  const cancelRecording = () => {
    cleanupAudio();
    setVoiceState('LISTO');
  };

  const togglePlayback = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const submitAudio = async () => {
    if (!audioBlobRef.current) return;
    
    // Validate size (10 MB)
    if (audioBlobRef.current.size > 10 * 1024 * 1024) {
      setVoiceState('ERROR_RECUPERABLE');
      setVoiceError('El audio supera los 10MB permitidos.');
      return;
    }

    setVoiceState('ENVIANDO_AUDIO');
    setVoiceError('');

    try {
      // Convert Blob to Base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // remove data:audio/webm;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlobRef.current!);
      });

      setVoiceState('TRANSCRIBIENDO');
      const response = await fetch('/api/voice/programming-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: audioBlobRef.current.type
        })
      });

      if (!response.ok) {
        let errMessage = 'Error en el servidor';
        try {
          const err = await response.json();
          if (err.error) errMessage = err.error;
        } catch {
          // If the server returns HTML (e.g. Vercel 500 error page)
          errMessage = `Error HTTP ${response.status}: Vercel/Servidor no pudo procesar la solicitud.`;
        }
        throw new Error(errMessage);
      }

      setVoiceState('INTERPRETANDO');
      const extraction: VoiceExtraction = await response.json();

      setVoiceState('RESOLVIENDO_CATALOGOS');
      
      const resolved = resolveVoiceData(extraction as any, catalogs, programmings, machineries);
      
      // Load resolved values into UI form state
      if (resolved.date.canonicalId) setDate(resolved.date.canonicalId);
      if (resolved.labor.canonicalId) setLaborId(resolved.labor.canonicalId);
      if (resolved.activity.canonicalId) setActivityId(resolved.activity.canonicalId);
      if (resolved.zone.canonicalId) setZone(resolved.zone.canonicalId);
      if (resolved.lot.canonicalId) setSelectedLocations([resolved.lot.canonicalId]);
      if (resolved.personnel.value && resolved.personnel.value.length > 0) setSelectedPersonnel(resolved.personnel.value);
      if (resolved.observations.value) setObservations(resolved.observations.value);

      setDraftResult(resolved);
      setVoiceState('BORRADOR_LISTO');
      
      cleanupAudio();

    } catch (err: any) {
      setVoiceState('ERROR_RECUPERABLE');
      setVoiceError(err.message || 'Error procesando el audio.');
      cleanupAudio();
    }
  };

  // --- MANUAL FORM SUBMISSION ---
  const handleSubmit = (e?: React.FormEvent, skipConflictCheck = false) => {
    if (e) e.preventDefault();
    setLoading(true);

    if (!skipConflictCheck) {
      const conflicts = absences.filter(a => selectedPersonnel.includes(a.personnelId));
      if (conflicts.length > 0) {
        setConflictAbsences(conflicts);
        setConflictModalOpen(true);
        setLoading(false);
        return; // Stop submission until user confirms
      }
    }

    const selectedLoteNames = selectedLocations
      .map(id => locations.find(l => l.id === id)?.name || id)
      .join(', ');

    if (isEditing) {
      const payload = {
        date,
        laborId,
        activityId,
        locationId: selectedLocations.join(','),
        locationIds: selectedLocations,
        zoneSnapshot: `${zone} - ${selectedLoteNames}`,
        loteSnapshot: selectedLoteNames,
        personnelIds: selectedPersonnel,
        observations,
        performancePerPerson: performance.performancePerPersonDay,
        expectedTotalQuantity: performance.plannedQuantity,
      };
      repository.updateProgramming(editRecord.id, payload, editRecord.version).then(res => {
        setLoading(false);
        if (res.ok) {
          navigate('/programming/all');
        } else {
          setError(res.error || 'Error al actualizar programación');
        }
      });
      return;
    }

    const payload = {
      date,
      idSupervisor: user?.idSupervisor,
      laborId,
      activityId,
      locationId: selectedLocations.join(','),
      locationIds: selectedLocations,
      zoneSnapshot: `${zone} - ${selectedLoteNames}`,
      loteSnapshot: selectedLoteNames,
      personnelIds: selectedPersonnel,
      status: 'PENDIENTE',
      observations,
      performancePerPerson: performance.performancePerPersonDay,
      expectedTotalQuantity: performance.plannedQuantity,
      origin: method
    };
    repository.createProgramming(payload).then(res => {
      setLoading(false);
      if (res.ok) {
        navigate('/programming/pending');
      } else {
        alert(res.error);
      }
    });
  };

  const handleResolveConflicts = async () => {
    setLoading(true);
    setConflictModalOpen(false);
    // Delete conflicting absences first
    for (const conflict of conflictAbsences) {
      await repository.deleteAbsence(conflict.id);
    }
    // Then proceed to submit ignoring conflicts
    handleSubmit(undefined, true);
  };

  const togglePersonnel = (id: string) => {
    setSelectedPersonnel(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const filteredPersonnel = allPersonnel.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.documento.includes(searchTerm)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          {isEditing ? 'Editar Programación' : 'Nueva Programación'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {isEditing 
            ? 'Modifica los datos de la programación confirmada o existente.' 
            : 'Crea una programación usando tu voz o mediante el formulario.'}
        </p>
      </div>

      {!isEditing && (
        <div className="flex bg-gray-200/80 p-1 rounded-lg">
          <button 
            type="button"
            onClick={() => setMethod('voice')} 
            className={cn("flex-1 py-2.5 text-xs md:text-sm font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer", method === 'voice' ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-primary hover:bg-gray-100")}
          >
            Dictado por Voz
          </button>
          <button 
            type="button"
            onClick={() => { setMethod('form'); setVoiceState('LISTO'); }} 
            className={cn("flex-1 py-2.5 text-xs md:text-sm font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer", method === 'form' ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-primary hover:bg-gray-100")}
          >
            Formulario Manual
          </button>
        </div>
      )}

      {conflictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-negative flex items-center gap-2 mb-4">
              <AlertCircle size={20} />
              Conflicto de Inasistencias
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Las siguientes personas están marcadas como inasistentes hoy. ¿Deseas aceptar el cambio y <strong>eliminar</strong> sus inasistencias?
            </p>
            <ul className="text-sm list-disc pl-5 text-gray-600 mb-6 max-h-32 overflow-y-auto">
              {conflictAbsences.map(c => (
                <li key={c.id}>{c.personnelName}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConflictModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleResolveConflicts} className="bg-negative hover:bg-negative/90 text-white font-bold">Aceptar y Sobrescribir</Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {error && <div className="mb-4 text-sm text-negative bg-negative/10 p-3 rounded flex items-start gap-2"><AlertCircle size={16} className="mt-0.5" /><span>{error}</span></div>}
          
          {method === 'voice' && (
            <div className="space-y-6">
              {/* Voice Status UI */}
              <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-xl border border-gray-200">
                
                {voiceState === 'LISTO' && (
                  <>
                    <Button onClick={startRecording} size="lg" className="rounded-full w-16 h-16 mb-4">
                      <Mic size={24} color="white" stroke="white" />
                    </Button>
                    <p className="text-gray-600 text-center max-w-sm text-sm">
                      Toca para hablar. Menciona fecha, zona, lote, labor, actividad y personal.
                    </p>
                    <p className="text-xs text-gray-400 mt-2 text-center max-w-sm italic">
                      Ej: "Para mañana en El Carmen, lote 03B006, realizar cosecha, actividad cargue de fruta, con Pedro Pérez y Juan Rodríguez."
                    </p>
                  </>
                )}

                {(voiceState === 'SOLICITANDO_PERMISO' || voiceState === 'GRABANDO') && (
                  <>
                    <Button variant="destructive" onClick={stopRecording} size="lg" className="rounded-full w-16 h-16 mb-4 animate-pulse bg-negative hover:bg-negative/90 text-white">
                      <Square size={24} color="white" fill="white" stroke="white" />
                    </Button>
                    <p className="text-negative font-medium animate-pulse">
                      {voiceState === 'SOLICITANDO_PERMISO' ? 'Solicitando permiso...' : 'Grabando...'}
                    </p>
                    {voiceState === 'GRABANDO' && (
                      <p className="text-2xl font-mono mt-2">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</p>
                    )}
                  </>
                )}



                {(voiceState === 'ENVIANDO_AUDIO' || voiceState === 'TRANSCRIBIENDO' || voiceState === 'INTERPRETANDO' || voiceState === 'RESOLVIENDO_CATALOGOS') && (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-primary font-medium text-sm">
                      {voiceState === 'ENVIANDO_AUDIO' && 'Enviando audio al servidor...'}
                      {voiceState === 'TRANSCRIBIENDO' && 'Transcribiendo audio...'}
                      {voiceState === 'INTERPRETANDO' && 'Interpretando instrucciones...'}
                      {voiceState === 'RESOLVIENDO_CATALOGOS' && 'Resolviendo catálogos...'}
                    </p>
                  </div>
                )}

                {voiceState === 'ERROR_RECUPERABLE' && (
                  <div className="text-center">
                    <AlertCircle size={32} className="text-negative mx-auto mb-2" />
                    <p className="text-negative text-sm mb-4">{voiceError}</p>
                    <Button variant="outline" onClick={() => setVoiceState('LISTO')}>
                      Reintentar
                    </Button>
                  </div>
                )}

                {voiceState === 'BORRADOR_LISTO' && (
                  <div className="w-full px-4 text-center">
                    <CheckCircle2 size={32} className="text-positive mx-auto mb-2" />
                    <p className="text-positive font-medium">Borrador generado</p>
                    <p className="text-sm text-gray-500 mt-1">Revisa los datos extraídos abajo antes de crear el pendiente.</p>
                  </div>
                )}
              </div>

              {/* Draft Review UI */}
              {(voiceState === 'BORRADOR_LISTO' || draftResult) && (
                <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center mb-2 border-b border-primary/10 pb-2">
                    <h3 className="font-semibold text-primary flex items-center gap-2"><FileText size={18}/> Transcripción</h3>
                    <Button variant="ghost" size="sm" onClick={() => setVoiceState('LISTO')} className="text-xs h-7 font-bold">
                      Volver a Grabar
                    </Button>
                  </div>
                  <p className="text-sm italic text-gray-700">{draftResult?.transcript}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-4">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Zona / Lote</span>
                      <div className="mt-1">
                        {draftResult?.zone.status === 'RECONOCIDO' && draftResult?.lot.status === 'RECONOCIDO' ? (
                          <span className="text-positive font-medium flex items-center gap-1"><Check size={14}/> {draftResult.zone.value} - {draftResult.lot.value}</span>
                        ) : (
                          <span className="text-negative font-medium flex items-center gap-1"><X size={14}/> Faltan datos o inválido</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Labor / Actividad</span>
                      <div className="mt-1">
                        {draftResult?.labor.status === 'RECONOCIDO' && draftResult?.activity.status === 'RECONOCIDO' ? (
                          <span className="text-positive font-medium flex items-center gap-1"><Check size={14}/> {draftResult.labor.value} / {draftResult.activity.value}</span>
                        ) : (
                          <span className="text-negative font-medium flex items-center gap-1"><X size={14}/> Revisar selección manual</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-gray-200 md:col-span-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Personal Identificado ({draftResult?.personnel.value?.length || 0})</span>
                      <div className="mt-1">
                        {draftResult?.personnel.status === 'RECONOCIDO' ? (
                          <span className="text-positive font-medium flex items-center gap-1"><Check size={14}/> {draftResult.personnel.value.length} personas listas</span>
                        ) : (
                          <span className="text-warning-700 font-medium flex items-start gap-1">
                            <AlertCircle size={14} className="mt-0.5 shrink-0"/> 
                            <span>{draftResult?.personnel.message || 'Requiere revisión manual'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback to form for manual editing/completion, always visible unless hiding completely for strict flow, but user wants manual completion possible */}
          {(method === 'form' || voiceState === 'BORRADOR_LISTO') && (
            <form onSubmit={handleSubmit} className="space-y-6 mt-2">
              
              {voiceState === 'BORRADOR_LISTO' && (
                <div className="text-sm font-semibold text-gray-500 uppercase mb-2 border-b pb-2">Completar Formulario Manual</div>
              )}

              {/* Banner de Contexto en Vivo */}
              {(() => {
                const currentLabor = labors.find(l => l.id === laborId);
                const currentAct = activities.find(a => a.id === activityId);
                return (
                  <div className="bg-gradient-to-r from-emerald-800 to-forest-950 text-white p-3.5 rounded-xl shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <CalendarPlus size={22} className="text-white" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold block">
                            📌 Estás Programando:
                          </span>
                          <span className="text-base font-extrabold text-white block">
                            {currentLabor?.name || 'Seleccione Labor'} {currentAct?.name ? `— ${currentAct.name}` : ''}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-emerald-100 mt-0.5 flex-wrap font-medium">
                            <span>👥 <strong className="text-white">{selectedPersonnel.length}</strong> {selectedPersonnel.length === 1 ? 'Persona' : 'Personas'}</span>
                            <span>•</span>
                            <span>📍 <strong className="text-white">{zone || 'Sin Zona'}</strong> {selectedLocations.length > 0 ? `(${selectedLocations.length} lotes)` : ''}</span>
                            <span>•</span>
                            <span>📅 <strong className="text-white">{date}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="self-start sm:self-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          selectedPersonnel.length > 0 && selectedLocations.length > 0 && activityId
                            ? "bg-lime-400 text-forest-950 shadow-xs"
                            : "bg-white/20 text-white"
                        )}>
                          {selectedPersonnel.length > 0 && selectedLocations.length > 0 && activityId
                            ? '✓ Listo para guardar'
                            : 'Completando pasos...'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 1️⃣ PASO 1: Fecha y Supervisor */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-blue-950 flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-black">1</span>
                    Fecha y Supervisor
                  </h3>
                  {date && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-700" /> Listo
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date" className="text-xs font-semibold text-blue-900">Fecha de Programación *</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      required 
                      className="bg-white font-bold text-sm h-10 border-blue-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supervisor" className="text-xs font-semibold text-blue-900">Supervisor Asignado</Label>
                    <Input 
                      id="supervisor" 
                      value={user?.name || ''} 
                      disabled 
                      className="bg-white/80 font-bold text-sm h-10 border-blue-200 text-gray-700"
                    />
                  </div>
                </div>
              </div>

              {/* 2️⃣ PASO 2: Labor y Actividad */}
              <div className={cn(
                "p-4 rounded-xl border space-y-3 transition-all",
                laborId && activityId ? "bg-emerald-50/60 border-emerald-200/80" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-950 flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-xs font-black">2</span>
                    ¿Qué labor van a realizar?
                  </h3>
                  {laborId && activityId ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-700" /> Listo
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-800 font-semibold italic">Seleccione labor y actividad</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="labor" className="text-xs font-semibold text-emerald-900">Labor *</Label>
                    <Combobox 
                      options={labors.map(l => ({ value: l.id, label: l.name }))}
                      value={laborId}
                      onChange={setLaborId}
                      placeholder="Seleccione una labor..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="activity" className="text-xs font-semibold text-emerald-900">Actividad *</Label>
                    <Combobox 
                      options={activities.map(a => ({ value: a.id, label: a.name, description: a.unit }))}
                      value={activityId}
                      onChange={setActivityId}
                      placeholder={!laborId ? 'Seleccione labor primero' : activities.length === 0 ? 'Sin actividades' : 'Seleccione una actividad...'}
                      disabled={!laborId || activities.length === 0}
                    />
                    {laborId && activities.length === 0 && (
                      <p className="text-xs text-warning-700 font-semibold mt-1">No hay actividades registradas en esta labor.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3️⃣ PASO 3: Ubicación (Zona y Lotes) */}
              <div className={cn(
                "p-4 rounded-xl border space-y-3 transition-all",
                zone && selectedLocations.length > 0 ? "bg-purple-50/60 border-purple-200/80" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-purple-950 flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white inline-flex items-center justify-center text-xs font-black">3</span>
                    ¿En qué lugar van a trabajar?
                  </h3>
                  {zone && selectedLocations.length > 0 ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-700" /> {selectedLocations.length} Lote{selectedLocations.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-purple-800 font-semibold italic">Pendiente zona y lotes</span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="zone" className="text-xs font-semibold text-purple-900">Zona de Trabajo *</Label>
                    <Combobox 
                      options={zones.map(z => ({ value: String(z), label: String(z) }))}
                      value={zone}
                      onChange={(newZone) => {
                        setZone(newZone);
                        setSelectedLocations([]);
                      }}
                      placeholder="Seleccione zona..."
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lotes" className="font-semibold text-xs text-purple-900">
                        Lotes {zone ? `(${selectedLocations.length} seleccionados)` : ''} *
                      </Label>
                      {zone && lotes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLocations(lotes.map(l => l.id))}
                            className="text-[11px] font-bold text-purple-800 hover:text-purple-950 hover:underline cursor-pointer uppercase tracking-wider"
                          >
                            Seleccionar Todos
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedLocations([])}
                            className="text-[11px] font-bold text-gray-500 hover:text-red-700 hover:underline cursor-pointer uppercase tracking-wider"
                          >
                            Limpiar
                          </button>
                        </div>
                      )}
                    </div>

                    {!zone ? (
                      <div className="p-3 text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg text-center">
                        Seleccione una zona primero para desplegar los lotes disponibles.
                      </div>
                    ) : lotes.length === 0 ? (
                      <div className="p-3 text-xs text-warning-700 bg-amber-50 border border-amber-200 rounded-lg text-center font-medium">
                        No hay lotes registrados para la zona seleccionada.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lotes.length > 8 && (
                          <Input
                            placeholder="Buscar lote por código o nombre..."
                            value={loteSearchTerm}
                            onChange={(e) => setLoteSearchTerm(e.target.value)}
                            className="text-xs h-8 bg-white"
                          />
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-2.5 bg-white border border-purple-200 rounded-lg">
                          {filteredLotes.map(lote => {
                            const isSelected = selectedLocations.includes(lote.id);
                            return (
                              <div
                                key={lote.id}
                                onClick={() => toggleLocation(lote.id)}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all select-none shadow-2xs",
                                  isSelected
                                    ? "bg-purple-700 text-white border-purple-800 shadow-xs font-bold"
                                    : "bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                                )}
                              >
                                <span className="truncate mr-1.5">{lote.name}</span>
                                <div className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors",
                                  isSelected ? "bg-white text-purple-700 border-white" : "border-gray-300 bg-white"
                                )}>
                                  {isSelected && <Check size={11} className="stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {selectedLocations.length > 0 && (
                          <div className="text-[11px] text-purple-900 font-medium flex items-center gap-1">
                            <Check size={12} className="text-purple-700" />
                            <span>{selectedLocations.length} lote{selectedLocations.length > 1 ? 's' : ''} seleccionado{selectedLocations.length > 1 ? 's' : ''} para esta labor.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4️⃣ PASO 4: Personal Asignado */}
              <div className={cn(
                "p-4 rounded-xl border space-y-3 transition-all",
                selectedPersonnel.length > 0 ? "bg-amber-50/60 border-amber-200/80" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-amber-950 flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-xs font-black">4</span>
                    ¿Quiénes van a trabajar?
                  </h3>
                  {selectedPersonnel.length > 0 ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-700" /> {selectedPersonnel.length} Personas
                    </span>
                  ) : (
                    <span className="text-xs text-amber-800 font-semibold italic">0 Personas asignadas</span>
                  )}
                </div>
                
                <Input 
                  placeholder="Buscar por nombre o cédula..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white h-9"
                />
                <div className="h-[40vh] md:h-64 overflow-y-auto border border-amber-200/80 rounded-md bg-white p-2">
                  {filteredPersonnel.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-4">No se encontró personal disponible</div>
                  ) : (
                    <div className="space-y-1">
                      {filteredPersonnel.map(p => {
                        const isSelected = selectedPersonnel.includes(p.id);
                        const novedad = (catalogs.personnelNovelties || []).find((n:any) => n.personaDocumento === p.documento && n.fechaInicio <= date && n.fechaFin >= date);
                        const isProgrammed = programmings.some(prog => 
                           prog.date === date && prog.status === 'CONFIRMADA' && prog.personnelIds.includes(p.id)
                        );
                        const isMachinery = machineries.some(m => 
                           m.date === date && m.operatorId === p.id && m.status !== 'CANCELADA'
                        );
                        
                        const isDisabled = !!novedad || isProgrammed || isMachinery;
                        
                        return (
                          <div 
                            key={p.id}
                            onClick={() => { if (!isDisabled) togglePersonnel(p.id); }}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-md transition-colors border min-h-[44px]",
                              isDisabled 
                                ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                                : isSelected 
                                  ? "bg-amber-100/90 border-amber-400 text-amber-950 font-semibold cursor-pointer shadow-2xs" 
                                  : "bg-white border-gray-200 hover:bg-amber-50/50 text-gray-700 cursor-pointer"
                            )}
                          >
                            <div>
                              <div className="font-bold text-sm">{p.name}</div>
                              <div className="text-xs text-gray-600">
                                C.C. {p.documento} 
                                {novedad && <span className="ml-2 font-bold text-red-600">({novedad.tipo} hasta {novedad.fechaFin})</span>}
                                {isProgrammed && <span className="ml-2 font-bold text-red-600">(Ya programado)</span>}
                                {isMachinery && <span className="ml-2 font-bold text-red-600">(En maquinaria)</span>}
                              </div>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0",
                              isDisabled ? "border-gray-300 bg-gray-200" : isSelected ? "border-amber-600 bg-amber-600" : "border-gray-300"
                            )}>
                              {isSelected && <Check size={12} className="text-white stroke-[3]" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 5️⃣ PASO 5: Rendimiento Estimado y Observaciones */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-gray-700 text-white inline-flex items-center justify-center text-xs font-black">5</span>
                    Rendimiento y Observaciones
                  </h3>
                </div>

                {/* Rendimiento (Only show if an activity is selected) */}
                {activityId && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="mb-0 text-xs font-bold text-gray-800">Rendimiento Estimado ({performance.unit})</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsEditingPerformance(!isEditingPerformance)}
                        className="text-xs h-7 text-forest-800 font-bold hover:bg-forest-100"
                      >
                        {isEditingPerformance ? 'Bloquear' : 'Modificar Rendimiento'}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="perfPerPerson" className="text-[11px] text-gray-500 uppercase font-semibold">Por persona / día</Label>
                        <Input
                          id="perfPerPerson"
                          type="number"
                          step="0.01"
                          disabled={!isEditingPerformance}
                          value={performance.performancePerPersonDay !== null ? performance.performancePerPersonDay : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            setPerformance(prev => ({
                              ...prev,
                              performancePerPersonDay: val,
                              plannedQuantity: val !== null ? val * selectedPersonnel.length : null,
                              wasManuallyEdited: true
                            }));
                          }}
                          className={!isEditingPerformance ? "bg-gray-100 font-bold text-sm" : "font-bold text-sm border-forest-600"}
                          placeholder="N/A"
                        />
                        {!isEditingPerformance && performance.referencePerformancePerPersonDay !== null && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            Estándar: {performance.referencePerformancePerPersonDay} {performance.unit}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="totalPerf" className="text-[11px] text-gray-500 uppercase font-semibold">Cantidad Total ({selectedPersonnel.length} personas)</Label>
                        <Input
                          id="totalPerf"
                          type="number"
                          disabled
                          value={performance.plannedQuantity !== null ? performance.plannedQuantity.toFixed(2) : ''}
                          className="bg-gray-100 font-bold text-sm text-forest-900"
                          placeholder="N/A"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="obs" className="text-xs font-semibold text-gray-700">Observaciones (Opcional)</Label>
                  <Input 
                    id="obs"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Notas adicionales de la labor..."
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Botón de Guardado Prominente */}
              <div className="pt-2">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={loading || !laborId || (activities.length > 0 && !activityId) || !zone || selectedLocations.length === 0 || selectedPersonnel.length === 0} 
                  className="w-full h-14 text-base font-black bg-forest-900 hover:bg-forest-950 text-white shadow-xl rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={22} className="text-lime-400 stroke-[3]" />
                  {loading ? 'Procesando...' : isEditing ? 'Guardar Cambios de Programación' : 'Crear Pendiente de Programación'}
                </Button>
              </div>

            </form>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
