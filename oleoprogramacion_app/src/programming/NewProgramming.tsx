import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { repository } from '../shared/AgronomicRepository';
import { useCatalogs } from '../shared/useCatalogs';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, Button, Input, Label, cn } from '@/src/components/ui';
import { Combobox } from '@/src/components/ui/combobox';
import { Labor, Activity, Location, Personnel, Novedad, VoiceExtraction, ProgrammingPerformance, ActivityPerformanceReference, ResolvedField } from '../types';
import { Mic, MicOff, Square, RefreshCcw, Check, X, AlertCircle, Play, Pause, FileText, CheckCircle2 } from 'lucide-react';
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
  
  // Data
  const labors = (catalogs.labors || []).filter(l => l.active);
  const allActivities = (catalogs.activities || []).filter(a => a.active);
  const locations = (catalogs.locations || []).filter(l => l.active);
  const allPersonnel = (catalogs.personnel || []).filter(p => p.active && isOperative(p));
  const allNovedades = (catalogs.personnelNovelties || []) || [];
  
  const zones = Array.from(new Set(locations.map(l => l.zone))).sort();
  
  // State: Form (Manual)
  const [method, setMethod] = useState<'form' | 'voice'>('form');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  
  const [laborId, setLaborId] = useState(cloneTemplate?.laborId || '');
  const [activityId, setActivityId] = useState(cloneTemplate?.activityId || '');
  const [zone, setZone] = useState(cloneTemplate?.zoneSnapshot?.split(' - ')[0] || '');
  const [locationId, setLocationId] = useState(cloneTemplate?.locationId || '');
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>(cloneTemplate?.personnelIds || []);
  const [observations, setObservations] = useState(cloneTemplate?.observations || '');
  
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
             performancePerPersonDay: null,
             plannedQuantity: null,
             wasManuallyEdited: false
           };
        }
        return {
          unit: newUnit,
          referencePerformancePerPersonDay: ref.performancePerPersonDay,
          performancePerPersonDay: ref.performancePerPersonDay,
          plannedQuantity: ref.performancePerPersonDay * uniquePersonnelCount,
          wasManuallyEdited: false
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
  const lotes = zone ? locations.filter(l => l.zone === zone) : [];
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
      const currentValid = (catalogs.locations || []).find(l => l.active && l.id === locationId && l.zone === zone);
      if (!currentValid && locationId !== '') {
        setLocationId(''); 
      }
    } else {
      if (locationId !== '') setLocationId('');
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
  };

  const startRecording = async () => {
    cleanupAudio();
    setVoiceState('SOLICITANDO_PERMISO');
    setVoiceError('');
    setDraftResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        audioBlobRef.current = audioBlob;
        audioUrlRef.current = URL.createObjectURL(audioBlob);
        audioElementRef.current = new Audio(audioUrlRef.current);
        audioElementRef.current.onended = () => setIsPlaying(false);
        
        // Stop all tracks to turn off the microphone light
        stream.getTracks().forEach(track => track.stop());

        // Send automatically
        submitAudio();
      };

      mediaRecorder.start();
      setVoiceState('GRABANDO');
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      setVoiceState('ERROR_RECUPERABLE');
      setVoiceError('Permiso de micrófono denegado o no encontrado.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
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
      
      // Determine target date. If dateText is provided, try to parse it relative, else use current date in UI.
      // For simplicity in this demo, if they don't say a date, we use the UI date.
      // A full implementation would parse NLP dates. We'll just pass the UI date as fallback.
      const resolved = resolveVoiceData(extraction as any, catalogs, programmings, machineries);
      
      // Load resolved values into UI form state
      if (resolved.date.canonicalId) setDate(resolved.date.canonicalId);
      if (resolved.labor.canonicalId) setLaborId(resolved.labor.canonicalId);
      if (resolved.activity.canonicalId) setActivityId(resolved.activity.canonicalId);
      if (resolved.zone.canonicalId) setZone(resolved.zone.canonicalId);
      if (resolved.lot.canonicalId) setLocationId(resolved.lot.canonicalId);
      if (resolved.personnel.value && resolved.personnel.value.length > 0) setSelectedPersonnel(resolved.personnel.value);
      if (resolved.observations.value) setObservations(resolved.observations.value);

      setDraftResult(resolved);
      setVoiceState('BORRADOR_LISTO');
      
      // Clean up audio from memory as required
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

    const payload = {
      date,
      idSupervisor: user?.idSupervisor,
      laborId,
      activityId,
      locationId,
      zoneSnapshot: `${zone} - ${locations.find((l:any) => l.id === locationId)?.name}`,
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
        setTimeout(() => navigate('/programming/pending'), 2000);
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
        <h2 className="text-2xl font-bold text-primary">Nueva Programación</h2>
        <p className="text-gray-500 text-sm mt-1">Crea una programación usando tu voz o mediante el formulario.</p>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-lg">
        <button 
          onClick={() => setMethod('voice')} 
          className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-colors", method === 'voice' ? "bg-white shadow-sm text-primary" : "text-gray-500")}
        >
          Dictado por Voz
        </button>
        <button 
          onClick={() => { setMethod('form'); setVoiceState('LISTO'); }} 
          className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-colors", method === 'form' ? "bg-white shadow-sm text-primary" : "text-gray-500")}
        >
          Formulario Manual
        </button>
      </div>

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
              <Button onClick={handleResolveConflicts} className="bg-negative hover:bg-negative/90">Aceptar y Sobrescribir</Button>
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
                      Intentar de nuevo
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
                    <Button variant="ghost" size="sm" onClick={() => setVoiceState('LISTO')} className="text-xs h-7">
                      Volver a grabar
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
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              
              {voiceState === 'BORRADOR_LISTO' && (
                <div className="text-sm font-semibold text-gray-500 uppercase mb-2 border-b pb-2">Completar Formulario Manual</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="supervisor">Supervisor</Label>
                  <Input 
                    id="supervisor" 
                    value={user?.name || ''} 
                    disabled 
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <Label htmlFor="labor">Labor</Label>
                  <Combobox 
                    options={labors.map(l => ({ value: l.id, label: l.name }))}
                    value={laborId}
                    onChange={setLaborId}
                    placeholder="Seleccione una labor"
                  />
                </div>
                
                <div>
                  <Label htmlFor="activity">Actividad</Label>
                  <Combobox 
                    options={activities.map(a => ({ value: a.id, label: a.name, description: a.unit }))}
                    value={activityId}
                    onChange={setActivityId}
                    placeholder={!laborId ? 'Seleccione labor primero' : activities.length === 0 ? 'Sin actividades' : 'Seleccione una actividad'}
                    disabled={!laborId || activities.length === 0}
                  />
                  {laborId && activities.length === 0 && (
                    <p className="text-xs text-warning mt-1">No hay actividades en esta labor.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <Label htmlFor="zone">Zona</Label>
                  <Combobox 
                    options={zones.map(z => ({ value: String(z), label: String(z) }))}
                    value={zone}
                    onChange={setZone}
                    placeholder="Seleccione zona"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Lote</Label>
                  <Combobox 
                    options={lotes.map(l => ({ value: l.id, label: l.name }))}
                    value={locationId}
                    onChange={setLocationId}
                    placeholder={!zone ? 'Seleccione zona primero' : 'Seleccione lote'}
                    disabled={!zone}
                  />
                </div>
              </div>
              
              {/* Performance / Rendimiento (Only show if an activity is selected) */}
              {activityId && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <Label className="mb-0 text-base">Rendimiento Estimado ({performance.unit})</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingPerformance(!isEditingPerformance)}
                      className="text-xs h-7 text-primary"
                    >
                      {isEditingPerformance ? 'Bloquear' : 'Modificar Rendimiento'}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="perfPerPerson" className="text-xs text-gray-500 uppercase">Por persona / día</Label>
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
                        className={!isEditingPerformance ? "bg-gray-100 font-medium" : "font-medium border-primary"}
                        placeholder="N/A"
                      />
                      {!isEditingPerformance && performance.referencePerformancePerPersonDay !== null && (
                        <p className="text-xs text-gray-500 mt-1">
                          Estándar: {performance.referencePerformancePerPersonDay} {performance.unit}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="totalPerf" className="text-xs text-gray-500 uppercase">Cantidad Total ({selectedPersonnel.length} personas)</Label>
                      <Input
                        id="totalPerf"
                        type="number"
                        disabled
                        value={performance.plannedQuantity !== null ? performance.plannedQuantity.toFixed(2) : ''}
                        className="bg-gray-100 font-medium"
                        placeholder="N/A"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Personnel Selection */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="flex justify-between items-center mb-4">
                  <Label className="mb-0 text-base">Personal Asignado ({selectedPersonnel.length}) / {filteredPersonnel.length} Resultados</Label>
                </div>
                
                <Input 
                  placeholder="Buscar por nombre o cédula..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />
                <div className="h-[40vh] md:h-64 overflow-y-auto border border-gray-200 rounded-md bg-white p-2">
                  {filteredPersonnel.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-4">No se encontró personal</div>
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
                                  ? "bg-primary/5 border-primary text-primary cursor-pointer" 
                                  : "bg-white border-transparent hover:bg-gray-50 text-gray-700 hover:border-gray-200 cursor-pointer"
                            )}
                          >
                            <div>
                              <div className="font-medium text-sm">{p.name}</div>
                              <div className="text-xs opacity-80">
                                C.C. {p.documento} 
                                {novedad && <span className="ml-2 font-semibold text-red-600">({novedad.tipo} hasta {novedad.fechaFin})</span>}
                                {isProgrammed && <span className="ml-2 font-semibold text-red-600">(Ya programado)</span>}
                                {isMachinery && <span className="ml-2 font-semibold text-red-600">(En maquinaria)</span>}
                              </div>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0",
                              isDisabled ? "border-gray-300 bg-gray-200" : isSelected ? "border-primary bg-primary" : "border-gray-300"
                            )}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="obs">Observaciones (Opcional)</Label>
                <Input 
                  id="obs"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>

              {/* Mobile sticky button container */}
              <div className="fixed md:static bottom-16 md:bottom-auto left-0 right-0 bg-white md:bg-transparent border-t md:border-t-0 border-gray-200 p-4 md:p-0 z-10 flex justify-end">
                <Button type="submit" size="lg" disabled={loading || !laborId || (activities.length > 0 && !activityId) || !locationId || selectedPersonnel.length === 0} className="w-full md:w-auto min-h-[44px]">
                  {loading ? 'Procesando...' : 'Crear Pendiente'}
                </Button>
              </div>

            </form>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
