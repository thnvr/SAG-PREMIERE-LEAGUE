import { useState, useEffect, useCallback } from 'react';
import { teamsAPI } from '../services/sheetsService';

export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamsAPI.getAll();
      setTeams(data.teams || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const getTeamById = useCallback(
    (id) => teams.find((t) => t._id === id || t.id === id),
    [teams]
  );

  const getTeamColor = useCallback((teamName) => {
    const name = (teamName || '').toLowerCase();
    if (name.includes('alpha')) return '#22c55e';
    if (name.includes('bravo')) return '#3b82f6';
    if (name.includes('charlie')) return '#ef4444';
    return '#64748b';
  }, []);

  const getTeamColorClass = useCallback((teamName) => {
    const name = (teamName || '').toLowerCase();
    if (name.includes('alpha')) return 'text-team-alpha';
    if (name.includes('bravo')) return 'text-team-bravo';
    if (name.includes('charlie')) return 'text-team-charlie';
    return 'text-slate-400';
  }, []);

  const getTeamBgClass = useCallback((teamName) => {
    const name = (teamName || '').toLowerCase();
    if (name.includes('alpha')) return 'bg-team-alpha';
    if (name.includes('bravo')) return 'bg-team-bravo';
    if (name.includes('charlie')) return 'bg-team-charlie';
    return 'bg-slate-500';
  }, []);

  return {
    teams,
    loading,
    error,
    fetchTeams,
    getTeamById,
    getTeamColor,
    getTeamColorClass,
    getTeamBgClass,
  };
}

export default useTeams;
