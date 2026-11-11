import { useState, useEffect, useCallback } from 'react';
import { playersAPI } from '../services/sheetsService';

export function usePlayers(initialFilters = {}) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    position: '',
    status: '',
    team: '',
    search: '',
    category: '',
    page: 1,
    limit: 50,
    ...initialFilters,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
  });

  const fetchPlayers = useCallback(async (overrideFilters) => {
    const currentFilters = overrideFilters || filters;
    setLoading(true);
    setError(null);
    try {
      const data = await playersAPI.getAll(currentFilters);
      setPlayers(data.players || data || []);
      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination({
          total: (data.players || data || []).length,
          page: 1,
          pages: 1,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      position: '',
      status: '',
      team: '',
      search: '',
      category: '',
      page: 1,
      limit: 50,
    });
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    players,
    loading,
    error,
    filters,
    pagination,
    fetchPlayers,
    updateFilter,
    resetFilters,
    setPage,
    setFilters,
  };
}

export default usePlayers;
