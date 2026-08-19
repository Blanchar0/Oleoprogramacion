import { useState, useEffect } from 'react';
import { repository } from './AgronomicRepository';

export function useCatalogs() {
  const [catalogs, setCatalogs] = useState<any>({
    users: [], supervisors: [], personnel: [], 
    labors: [], activities: [], locations: [], 
    equipment: [], performanceReferences: [], personnelNovelties: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = repository.subscribeCatalogs((data) => {
      setCatalogs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { catalogs, loading };
}
