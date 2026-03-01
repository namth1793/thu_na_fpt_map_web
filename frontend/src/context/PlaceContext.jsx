import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { placesAPI } from '../utils/api';

const PlaceContext = createContext(null);

export function PlaceProvider({ children }) {
  const [places, setPlaces] = useState([]);
  const [placeTypes, setPlaceTypes] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type_id: '',
    min_rating: '',
    max_distance: '',
    sort: 'distance',
  });

  useEffect(() => {
    placesAPI.getTypes()
      .then(res => setPlaceTypes(res.data))
      .catch(console.error);
  }, []);

  const loadPlaces = useCallback(async (overrideFilters = null) => {
    setLoading(true);
    try {
      const params = overrideFilters || filters;
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      );
      const res = await placesAPI.getAll(clean);
      setPlaces(res.data);
    } catch (err) {
      console.error('Lỗi tải địa điểm:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPlaces();
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ search: '', type_id: '', min_rating: '', max_distance: '', sort: 'distance' });
  };

  return (
    <PlaceContext.Provider value={{
      places, placeTypes, selectedPlace, setSelectedPlace,
      loading, filters, updateFilter, resetFilters, loadPlaces,
    }}>
      {children}
    </PlaceContext.Provider>
  );
}

export const usePlaces = () => useContext(PlaceContext);
