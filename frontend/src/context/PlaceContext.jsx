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
    type_ids: [],
    min_rating: '',
    max_distance: '',
    sorts: ['distance'],
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
      const clean = {};
      if (params.search) clean.search = params.search;
      if (params.type_ids && params.type_ids.length > 0) clean.type_ids = params.type_ids.join(',');
      if (params.min_rating) clean.min_rating = params.min_rating;
      if (params.max_distance) clean.max_distance = params.max_distance;
      clean.sorts = (params.sorts && params.sorts.length > 0) ? params.sorts.join(',') : 'distance';
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

  const toggleType = (id) => {
    setFilters(prev => {
      const ids = prev.type_ids.includes(id)
        ? prev.type_ids.filter(x => x !== id)
        : [...prev.type_ids, id];
      return { ...prev, type_ids: ids };
    });
  };

  const toggleSort = (key) => {
    setFilters(prev => {
      const sorts = prev.sorts.includes(key)
        ? prev.sorts.filter(x => x !== key)
        : [...prev.sorts, key];
      return { ...prev, sorts: sorts.length > 0 ? sorts : ['distance'] };
    });
  };

  const resetFilters = () => {
    setFilters({ search: '', type_ids: [], min_rating: '', max_distance: '', sorts: ['distance'] });
  };

  return (
    <PlaceContext.Provider value={{
      places, placeTypes, selectedPlace, setSelectedPlace,
      loading, filters, updateFilter, toggleType, toggleSort, resetFilters, loadPlaces,
    }}>
      {children}
    </PlaceContext.Provider>
  );
}

export const usePlaces = () => useContext(PlaceContext);
