import React, { useState, useEffect } from 'react';
import { adminAPI, teamsAPI, playersAPI, awardsAPI, formatMoney, addTeamToSheets, addPlayerToSheets, getDeletedTeamIds } from '../services/sheetsService';
import { useAuction } from '../context/AuctionContext';
import StatsCard from '../components/StatsCard';
import AwardsPoster from '../components/AwardsPoster';
import SpinPlayerAuction from '../components/SpinPlayerAuction';
import PlayerCard from '../components/PlayerCard';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  UserCheck,
  UserX,
  Wallet,
  TrendingUp,
  Shield,
  Activity,
  Plus,
  Edit,
  Trash2,
  Check,
  AlertCircle,
  Award,
  Sparkles,
  Zap,
  Image as ImageIcon,
  DollarSign,
  Star,
  Settings,
  Layers,
  Search,
  Filter,
  Shuffle,
  RotateCw,
  Eye,
  X
} from 'lucide-react';

export default function AdminDashboard() {
  const { players: contextPlayers = [], teams: contextTeams = [] } = useAuction();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'poster' | 'teams' | 'players' | 'badges'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Teams & Players & Badges & Awards data
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [awards, setAwards] = useState([]);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [previewPlayerCard, setPreviewPlayerCard] = useState(null);

  // Form states
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showAddBadgeModal, setShowAddBadgeModal] = useState(false);
  const [fixingTeamPurse, setFixingTeamPurse] = useState(null); // team object being edited for purse
  const [newPurseAmountRupees, setNewPurseAmountRupees] = useState('');

  // Add Team Form
  const [teamForm, setTeamForm] = useState({
    name: '',
    short_name: '',
    primary_color: '#ffd000',
    secondary_color: '#111215',
    initial_purse_rupees: 20000, // ₹20,000 = 2000000 paise
    max_squad_size: 15,
    captain_name: '',
    logo_url: ''
  });

  // Add Player Form
  const [playerForm, setPlayerForm] = useState({
    name: '',
    player_number: '',
    primary_position: 'ST',
    secondary_positions: '',
    base_price_rupees: 100, // ₹100 = 10000 paise
    age: 24,
    nationality: 'India',
    overall_rating: 80,
    category: 'standard',
    preferred_foot: 'Right',
    speed_rating: 75,
    shooting_rating: 75,
    passing_rating: 70,
    dribbling_rating: 75,
    defensive_rating: 60,
    physical_rating: 70,
    photo_url: '',
    selectedBadges: ['Finisher++']
  });

  // Add Badge Form
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    category: 'playstyle',
    icon: 'Award',
    color: '#ffd000',
    description: ''
  });

  // Player search in player tab
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerPosFilter, setPlayerPosFilter] = useState('ALL');

  const flashMessage = (msg, isError = false) => {
    if (isError) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 5000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const loadAllData = async () => {
    try {
      const [dashRes, teamsRes, playersRes, badgesRes, awardsRes] = await Promise.all([
        adminAPI.getDashboard().catch(() => null),
        teamsAPI.getAll().catch(() => []),
        playersAPI.getAll().catch(() => []),
        awardsAPI.getBadges().catch(() => ({ all: [] })),
        awardsAPI.getAwards().catch(() => [])
      ]);

      setData(dashRes);
      setTeams(contextTeams.length > 0 ? contextTeams : (teamsRes || []));
      setPlayers(contextPlayers.length > 0 ? contextPlayers : (playersRes || []));
      setBadges(badgesRes?.all || badgesRes || []);
      setAwards(awardsRes || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading admin suite:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);
  useEffect(() => {
    if (contextTeams && contextTeams.length > 0) {
      const deletedIds = getDeletedTeamIds();
      setTeams(contextTeams.filter(t => !deletedIds.has(t.id)));
    }
  }, [contextTeams]);

  useEffect(() => {
    if (contextPlayers && contextPlayers.length > 0) {
      setPlayers(contextPlayers);
    }
  }, [contextPlayers]);


  // 1. ADD TEAM HANDLER
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.name || !teamForm.short_name) {
      flashMessage('Team name and short tag are required', true);
      return;
    }
    try {
      const newTeamObj = {
        name: teamForm.name,
        short_name: teamForm.short_name.toUpperCase(),
        primary_color: teamForm.primary_color,
        secondary_color: teamForm.secondary_color,
        initial_purse: parseInt(teamForm.initial_purse_rupees, 10) * 100,
        max_squad_size: parseInt(teamForm.max_squad_size, 10),
        captain_name: teamForm.captain_name || 'Captain',
        logo_url: teamForm.logo_url
      };
      addTeamToSheets(newTeamObj).catch(() => {});
      await teamsAPI.create(newTeamObj);
      flashMessage(`Franchise "${teamForm.name}" created successfully!`);
      setShowAddTeamModal(false);
      setTeamForm({
        name: '',
        short_name: '',
        primary_color: '#ffd000',
        secondary_color: '#111215',
        initial_purse_rupees: 20000,
        max_squad_size: 15,
        captain_name: '',
        logo_url: ''
      });
      loadAllData();
    } catch (err) {
      flashMessage(err.message || 'Failed to create team', true);
    }
  };

  // 2. FIX / EDIT TEAM PURSE HANDLER
  const handleFixPurse = async (e) => {
    e.preventDefault();
    if (!fixingTeamPurse || !newPurseAmountRupees) return;
    try {
      const paiseAmount = parseInt(newPurseAmountRupees, 10) * 100;
      await awardsAPI.fixTeamPurse(fixingTeamPurse.id, paiseAmount);
      // Immediately reflect the updated purse in state
      setTeams((prev) =>
        prev.map((t) =>
          t.id === fixingTeamPurse.id
            ? {
                ...t,
                initial_purse: paiseAmount,
                total_purse: paiseAmount,
                remaining_purse: paiseAmount,
                remainingPurse: paiseAmount,
                availableBiddingPurse: paiseAmount,
              }
            : t
        )
      );
      flashMessage(`Updated purse for ${fixingTeamPurse.name} to ₹${parseInt(newPurseAmountRupees, 10).toLocaleString('en-IN')}`);
      setFixingTeamPurse(null);
      loadAllData();
    } catch (err) {
      flashMessage(err.message || 'Failed to update purse', true);
    }
  };

  // 2B. REMOVE FRANCHISE HANDLER
  const handleDeleteTeam = async (team) => {
    if (!team) return;
    const confirmMsg = `Are you sure you want to delete the franchise "${team.name}" (${team.short_name})?\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await teamsAPI.delete(team.id);
      setTeams(prev => prev.filter(t => t.id !== team.id));
      flashMessage(`Franchise "${team.name}" was removed successfully.`);
      loadAllData();
    } catch (err) {
      flashMessage(err.message || 'Failed to delete franchise', true);
    }
  };

  // 3. ADD PLAYER HANDLER (WITH AUTOMATIC POSITION & STATS BADGE CREATION)
  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!playerForm.name || !playerForm.primary_position) {
      flashMessage('Player name and position are required', true);
      return;
    }
    try {
      // Determine automatic badges based on position and top ratings
      const autoBadges = [...(playerForm.selectedBadges || [])];
      const pos = playerForm.primary_position;
      const speed = parseInt(playerForm.speed_rating || 0, 10);
      const shot = parseInt(playerForm.shooting_rating || 0, 10);
      const pass = parseInt(playerForm.passing_rating || 0, 10);
      const def = parseInt(playerForm.defensive_rating || 0, 10);
      const ovr = parseInt(playerForm.overall_rating || 0, 10);

      // Signature playstyle badge determination
      let primaryBadgeName = 'Finisher++';
      let badgeCategory = 'shooting';
      let badgeColor = '#ffd000';

      if (['ST', 'CF'].includes(pos)) {
        primaryBadgeName = shot >= 80 ? 'Elite Sniper' : 'Deadly Finisher';
        badgeCategory = 'shooting';
        badgeColor = '#ef4444';
      } else if (['LW', 'RW'].includes(pos)) {
        primaryBadgeName = speed >= 80 ? 'Speed Demon' : 'Electric Winger';
        badgeCategory = 'pace';
        badgeColor = '#38bdf8';
      } else if (['CAM', 'CM'].includes(pos)) {
        primaryBadgeName = pass >= 75 ? 'Master Playmaker' : 'Engine Maestro';
        badgeCategory = 'passing';
        badgeColor = '#a855f7';
      } else if (['CDM', 'CB', 'LB', 'RB'].includes(pos)) {
        primaryBadgeName = def >= 70 ? 'The Wall' : 'Tactical Stopper';
        badgeCategory = 'defending';
        badgeColor = '#22c55e';
      } else if (pos === 'GK') {
        primaryBadgeName = 'Safe Hands 🧤';
        badgeCategory = 'goalkeeping';
        badgeColor = '#f59e0b';
      }

      if (ovr >= 85) {
        autoBadges.push('Marquee Star ⭐');
      }

      if (!autoBadges.includes(primaryBadgeName)) {
        autoBadges.push(primaryBadgeName);
      }

      // Automatically register the generated badge into the badges catalog if not already present
      try {
        const { all: currentBadges } = await awardsAPI.getBadges();
        if (!currentBadges.some(b => b.name === primaryBadgeName)) {
          await awardsAPI.createBadge({
            name: primaryBadgeName,
            category: badgeCategory,
            icon: 'Award',
            color: badgeColor,
            description: `Signature ${pos} playstyle badge automatically generated for ${playerForm.name}.`
          });
        }
      } catch (err) {
        console.warn('Auto-badge generation notice:', err);
      }

      const finalBadges = Array.from(new Set(autoBadges));

      const newPlayerObj = {
        name: playerForm.name,
        player_number: playerForm.player_number,
        primary_position: playerForm.primary_position,
        secondary_positions: playerForm.secondary_positions ? playerForm.secondary_positions.split(',').map(s => s.trim()) : [],
        base_price: parseInt(playerForm.base_price_rupees, 10) * 100,
        age: parseInt(playerForm.age, 10),
        nationality: playerForm.nationality,
        overall_rating: parseInt(playerForm.overall_rating, 10),
        category: playerForm.category,
        preferred_foot: playerForm.preferred_foot,
        speed_rating: parseInt(playerForm.speed_rating, 10),
        shooting_rating: parseInt(playerForm.shooting_rating, 10),
        passing_rating: parseInt(playerForm.passing_rating, 10),
        dribbling_rating: parseInt(playerForm.dribbling_rating, 10),
        defensive_rating: parseInt(playerForm.defensive_rating, 10),
        physical_rating: parseInt(playerForm.physical_rating, 10),
        photo_url: playerForm.photo_url,
        badges: finalBadges
      };

      addPlayerToSheets(newPlayerObj).catch(() => {});
      const createdPlayer = await playersAPI.create(newPlayerObj);
      setPlayers((prev) => [createdPlayer, ...prev.filter(p => p.id !== createdPlayer.id)]);
      flashMessage(`Player "${playerForm.name}" registered with badge "${primaryBadgeName}" automatically!`);
      setShowAddPlayerModal(false);
      setPreviewPlayerCard(createdPlayer);
      setPlayerForm({
        name: '',
        player_number: '',
        primary_position: 'ST',
        secondary_positions: '',
        base_price_rupees: 100,
        age: 24,
        nationality: 'India',
        overall_rating: 80,
        category: 'standard',
        preferred_foot: 'Right',
        speed_rating: 75,
        shooting_rating: 75,
        passing_rating: 70,
        dribbling_rating: 75,
        defensive_rating: 60,
        physical_rating: 70,
        photo_url: '',
        selectedBadges: ['Finisher++']
      });
      loadAllData();
    } catch (err) {
      flashMessage(err.message || 'Failed to register player', true);
    }
  };

  // 4. ADD CUSTOM BADGE HANDLER
  const handleCreateBadge = async (e) => {
    e.preventDefault();
    if (!badgeForm.name) {
      flashMessage('Badge name is required', true);
      return;
    }
    try {
      await awardsAPI.createBadge(badgeForm);
      flashMessage(`Badge "${badgeForm.name}" created successfully!`);
      setShowAddBadgeModal(false);
      setBadgeForm({
        name: '',
        category: 'playstyle',
        icon: 'Award',
        color: '#ffd000',
        description: ''
      });
      loadAllData();
    } catch (err) {
      flashMessage(err.message || 'Failed to create badge', true);
    }
  };

  // 5. TOGGLE PLAYER BADGE HANDLER
  const handleTogglePlayerBadge = async (playerId, badgeName, hasBadge) => {
    try {
      await awardsAPI.assignPlayerBadge(playerId, badgeName, hasBadge ? 'remove' : 'add');
      flashMessage(`${hasBadge ? 'Removed' : 'Assigned'} badge "${badgeName}"`);
      loadAllData();
    } catch (err) {
      flashMessage(err.message || 'Failed to update badge', true);
    }
  };

  // 6. SAVE POSTER SETUP
  const handleSavePoster = async (posterConfig) => {
    try {
      await awardsAPI.saveAward({
        category: 'player_of_year',
        ...posterConfig
      });
      flashMessage('Tournament Awards Poster configuration saved successfully!');
      loadAllData();
    } catch (err) {
      flashMessage(err.message || 'Failed to save poster config', true);
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase()) || (p.club && p.club.toLowerCase().includes(playerSearch.toLowerCase()));
    const matchesPos = playerPosFilter === 'ALL' || p.primary_position === playerPosFilter;
    return matchesSearch && matchesPos;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#8b8e99]">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#ffd000] animate-spin" />
          <span className="font-bold text-sm">Loading Super Admin Suite...</span>
        </div>
      </div>
    );
  }


  // Dynamic summary calculations driven directly by Google Sheet sync / context
  const activeTeamsList = teams.length > 0 ? teams : contextTeams;
  const activePlayersList = players.length > 0 ? players : contextPlayers;

  const totalTeams = activeTeamsList.length;
  const totalPlayers = activePlayersList.length;

  const totalLeaguePurse = activeTeamsList.reduce((acc, t) => acc + (Number(t.total_purse ?? t.initial_purse) || 0), 0);
  const totalRemainingPurse = activeTeamsList.reduce((acc, t) => acc + (Number(t.remaining_purse ?? t.remainingPurse ?? t.total_purse ?? t.initial_purse) || 0), 0);
  const totalMoneySpent = Math.max(0, totalLeaguePurse - totalRemainingPurse);

  const soldPlayersCount = activePlayersList.filter(p => p.status === 'sold' || p.auction_status === 'sold').length;
  const unsoldPlayersCount = activePlayersList.filter(p => p.status === 'unsold' || p.auction_status === 'unsold').length;

  const stats = data?.stats || {};
  const teamSpending = data?.teamSpending || [];
  const positionDistribution = data?.positionDistribution || [];
  const recentPurchases = data?.recentPurchases || [];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8 bg-[#111215] text-white font-sans">
      
      {/* Toast Alert Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Super Admin Desk Master Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22242b]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd000]/10 border border-[#ffd000]/30 text-[#ffd000] font-mono text-xs font-bold mb-2">
            <span>●</span> SUPER ADMIN OPERATIONS COMMAND DESK
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            League Management &amp; Award Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#8b8e99] mt-1">
            Authoritative controls for teams, budgets, players, playstyle badges, and CAF-style awards poster generation.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddTeamModal(true)}
            className="px-4 py-2 rounded-xl bg-[#18191f] hover:bg-[#22242e] border border-[#262833] text-xs font-black text-white uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-[#ffd000]" />
            <span>+ Add Team</span>
          </button>

          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="px-4 py-2 rounded-xl bg-[#18191f] hover:bg-[#22242e] border border-[#262833] text-xs font-black text-white uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#ffd000]" />
            <span>+ Add Player</span>
          </button>

          <button
            onClick={() => setShowAddBadgeModal(true)}
            className="px-4 py-2 rounded-xl bg-[#18191f] hover:bg-[#22242e] border border-[#262833] text-xs font-black text-white uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-4 h-4 text-[#ffd000]" />
            <span>+ Add Badge</span>
          </button>

          <button
            onClick={() => setActiveTab('poster')}
            className="px-5 py-2 rounded-xl bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,208,0,0.35)] transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-4 h-4 fill-current" />
            <span>Poster Generator</span>
          </button>
        </div>
      </div>

      {/* Main Command Tabs Navigation */}
      <div className="flex items-center gap-1 bg-[#18191f] p-1.5 rounded-xl border border-[#262833] overflow-x-auto touch-scroll no-scrollbar">
        {[
          { id: 'overview', label: 'League Overview & Stats', icon: Activity },
          { id: 'spin', label: 'Spin Player Auction', icon: Shuffle, badge: 'NEW' },
          { id: 'poster', label: 'Awards & Poster Generator', icon: Trophy, badge: 'HOT' },
          { id: 'teams', label: 'Franchises & Fix Purse', icon: Shield },
          { id: 'players', label: 'Player Registry', icon: Users },
          { id: 'badges', label: 'Badge Studio', icon: Award }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#ffd000] text-[#0a0b0d] shadow-[0_0_15px_rgba(255,208,0,0.25)]'
                : 'text-[#8b8e99] hover:text-white hover:bg-[#111215]'
            }`}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${activeTab === tab.id ? 'bg-[#0a0b0d] text-[#ffd000]' : 'bg-[#ffd000] text-[#0a0b0d]'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================= TAB: SPIN PLAYER AUCTION ROOM ================= */}
      {activeTab === 'spin' && (
        <SpinPlayerAuction
          onNominated={(player) => {
            flashMessage(`Player "${player.name}" (${player.primary_position}) is now nominated to Live Auction!`);
            loadAllData();
          }}
        />
      )}

      {/* ================= TAB 1: TOURNAMENT SUMMARY & POSTER GENERATOR ================= */}
      {activeTab === 'poster' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#18191f] border border-[#262833] space-y-2">
            <div className="flex items-center gap-2 text-[#ffd000]">
              <Trophy className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-tight text-white">
                Official Tournament Summary &amp; Awards Poster Studio
              </h2>
            </div>
            <p className="text-xs text-[#8b8e99]">
              Recreates the prestige Black &amp; Gold Award layout. Fully editable finalist names, award titles, badges, and 1-click high-resolution PNG download!
            </p>
          </div>

          <AwardsPoster
            awardData={awards[0] || null}
            onSave={handleSavePoster}
            availablePlayers={players}
            availableTeams={teams}
            availableBadges={badges}
          />
        </div>
      )}

      {/* ================= TAB 2: FRANCHISES & PURSE FIXER ================= */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#18191f] border border-[#262833]">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#ffd000]" /> Franchise Purse &amp; Budget Ledger
              </h3>
              <p className="text-xs text-[#8b8e99] mt-0.5">
                Directly adjust and fix any franchise's total purse, view real-time spent balances, and manage squad quota.
              </p>
            </div>
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider shadow transition cursor-pointer"
            >
              + Create New Franchise
            </button>
          </div>

          {/* Teams Table & Purse Quick Edit */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => {
              const fin = t;
              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] hover:border-[#ffd000]/40 transition space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-[#0a0b0d] shadow"
                        style={{ backgroundColor: t.primary_color || '#ffd000' }}
                      >
                        {t.short_name}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white uppercase">{t.name}</h4>
                        <span className="text-[10px] text-[#8b8e99] font-mono">Leader: {t.captain_name || 'Captain'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setFixingTeamPurse(t);
                          setNewPurseAmountRupees((t.initial_purse / 100).toString());
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#ffd000]/15 hover:bg-[#ffd000]/25 text-[#ffd000] border border-[#ffd000]/30 text-xs font-black uppercase transition cursor-pointer flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Fix Purse</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTeam(t)}
                        title="Remove Franchise"
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#262833] text-center font-mono text-xs">
                    <div>
                      <span className="text-[9px] text-[#6b6e7a] uppercase block">Initial Purse</span>
                      <span className="font-bold text-white">{formatMoney(t.initial_purse)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6b6e7a] uppercase block">Total Spent</span>
                      <span className="font-bold text-rose-400">{formatMoney(t.totalSpent || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6b6e7a] uppercase block">Remaining</span>
                      <span className="font-black text-[#ffd000]">{formatMoney(t.remainingPurse || t.initial_purse)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#8b8e99] font-mono pt-2 border-t border-[#22242d]">
                    <span>Roster: <strong className="text-white">{t.squad?.length || 0} / {t.max_squad_size || 15}</strong></span>
                    <span className="text-[10px] text-cyan-400">Max Bid: {formatMoney(t.availableBiddingPurse || t.remainingPurse)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PLAYER REGISTRY ================= */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#18191f] border border-[#262833]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#6b6e7a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player name or club..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-[#111215] border border-[#262833] text-xs text-white placeholder-[#6b6e7a] outline-none focus:border-[#ffd000] w-64"
                />
              </div>

              <select
                value={playerPosFilter}
                onChange={(e) => setPlayerPosFilter(e.target.value)}
                className="bg-[#111215] border border-[#262833] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="ALL">All Positions</option>
                {['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'].map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider shadow transition cursor-pointer"
            >
              + Register New Player
            </button>
          </div>

          {/* Players Table */}
          <div className="rounded-2xl bg-[#18191f] border border-[#262833] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#111215] border-b border-[#262833] text-[#8b8e99] uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Player</th>
                    <th className="p-3">Position</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Base Price</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Badges</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22242d]">
                  {filteredPlayers.map((p) => (
                    <tr key={p.id} className="hover:bg-[#15161c] transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#111215] border border-[#2a2d38] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-bold text-[#ffd000]">{p.primary_position}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white font-sans">{p.name}</div>
                            <span className="text-[10px] text-[#6b6e7a]">{p.nationality} • {p.club || 'SAG FC'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-[#ffd000]/10 text-[#ffd000] border border-[#ffd000]/30 font-bold">
                          {p.primary_position}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{p.overall_rating || 80}</td>
                      <td className="p-3 font-black text-[#ffd000]">{formatMoney(p.base_price)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          p.auction_status === 'sold'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : p.auction_status === 'bidding'
                            ? 'bg-[#ffd000]/10 text-[#ffd000] animate-pulse'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {p.auction_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {Array.isArray(p.badges) && p.badges.length > 0 ? (
                            p.badges.map((b, bIdx) => (
                              <span key={bIdx} className="text-[9px] px-1.5 py-0.5 rounded bg-[#111215] border border-[#2d303d] text-[#ffd000]">
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#555866] text-[10px]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewPlayerCard(p)}
                            title="Preview Ultimate Player Card"
                            className="px-2.5 py-1 rounded bg-[#ffd000]/15 hover:bg-[#ffd000]/25 text-[#ffd000] border border-[#ffd000]/30 text-[10px] font-black uppercase transition cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Card</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('badges');
                            }}
                            className="px-2 py-1 rounded bg-[#111215] hover:bg-[#22242e] text-[#8b8e99] hover:text-white border border-[#2b2e3c] text-[10px] font-bold uppercase transition cursor-pointer"
                          >
                            Badges
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: BADGE STUDIO ================= */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#18191f] border border-[#262833]">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-5 h-5 text-[#ffd000]" /> Playstyle &amp; Award Badges Catalog
              </h3>
              <p className="text-xs text-[#8b8e99] mt-0.5">
                Create new badges or assign playstyles directly to registered players for their cards and award posters.
              </p>
            </div>
            <button
              onClick={() => setShowAddBadgeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider shadow transition cursor-pointer"
            >
              + Create New Badge
            </button>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((b) => (
              <div
                key={b.id || b.code}
                className="p-4 rounded-xl bg-[#18191f] border border-[#262833] hover:border-[#ffd000]/40 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shadow"
                    style={{ backgroundColor: (b.color || '#ffd000') + '22', color: b.color || '#ffd000' }}
                  >
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#111215] text-[#8b8e99] border border-[#262833]">
                    {b.category || 'playstyle'}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-sm text-white uppercase">{b.name}</h4>
                  <p className="text-[11px] text-[#8b8e99] line-clamp-2 mt-0.5">{b.description || 'Special tournament attribute badge.'}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Player Badge Assignment Matrix */}
          <div className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ffd000]" /> 1-Click Player Badge Assignment
            </h3>
            <p className="text-xs text-[#8b8e99]">
              Click any badge pill to immediately toggle it on or off for that player. Changes appear in real-time on player cards and award posters.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {players.slice(0, 15).map((p) => {
                const pBadges = Array.isArray(p.badges) ? p.badges : [];
                return (
                  <div key={p.id} className="p-3 rounded-xl bg-[#111215] border border-[#262833] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#ffd000]/10 text-[#ffd000] text-[10px] font-mono font-bold">
                        {p.primary_position}
                      </span>
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className="text-[10px] text-[#6b6e7a]">({p.club || 'SAG FC'})</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {badges.slice(0, 6).map((b) => {
                        const hasIt = pBadges.includes(b.name);
                        return (
                          <button
                            key={b.id || b.code}
                            onClick={() => handleTogglePlayerBadge(p.id, b.name, hasIt)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              hasIt
                                ? 'bg-[#ffd000] text-[#0a0b0d] shadow-[0_0_10px_rgba(255,208,0,0.3)]'
                                : 'bg-[#18191f] text-[#8b8e99] hover:text-white border border-[#282a35]'
                            }`}
                          >
                            {hasIt ? `✓ ${b.name}` : `+ ${b.name}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: LEAGUE OVERVIEW & STATS ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsCard
              title="Total Franchises"
              value={totalTeams}
              icon={Shield}
              variant="primary"
            />
            <StatsCard
              title="Total Registered"
              value={totalPlayers}
              icon={Users}
              variant="default"
            />
            <StatsCard
              title="Players Sold"
              value={soldPlayersCount}
              icon={UserCheck}
              variant="success"
            />
            <StatsCard
              title="Players Unsold"
              value={unsoldPlayersCount}
              icon={UserX}
              variant="danger"
            />
          </div>

          {/* Financial Health Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] shadow-lg">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#8b8e99]">Total League Purse</div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {formatMoney(totalLeaguePurse)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] shadow-lg">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#8b8e99]">Total Money Spent</div>
              <div className="text-2xl sm:text-3xl font-black text-[#ffd000] mt-1">
                {formatMoney(totalMoneySpent)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] shadow-lg">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#8b8e99]">Total Remaining Purse</div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1">
                {formatMoney(totalRemainingPurse)}
              </div>
            </div>
          </div>

          {/* Team Spending Progress Bars */}
          <div className="rounded-2xl p-6 bg-[#18191f] border border-[#262833] shadow-xl">
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ffd000]" /> Team Purse Utilization
            </h3>

            <div className="space-y-4">
              {teamSpending.map((t) => {
                const pct = Math.min(100, Math.round((t.totalSpent / (t.initialPurse || 1)) * 100));
                return (
                  <div key={t.id} className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2 font-sans">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#ffd000' }} />
                        {t.name}
                      </span>
                      <span className="text-[#8b8e99]">
                        Spent: <strong className="text-[#ffd000]">{formatMoney(t.totalSpent)}</strong> / {formatMoney(t.initialPurse)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#111215] rounded-full h-2.5 overflow-hidden border border-[#262833]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: t.color || '#ffd000' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Position Breakdown & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl p-6 bg-[#18191f] border border-[#262833] shadow-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Position Breakdown
              </h3>

              <div className="space-y-2 font-mono">
                {positionDistribution.map((pos) => (
                  <div
                    key={pos.primary_position}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#111215] border border-[#262833] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-center font-black px-1.5 py-0.5 rounded bg-[#18191f] text-[#ffd000] border border-[#282a35]">
                        {pos.primary_position}
                      </span>
                      <span className="text-white font-sans">{pos.count} Players Registered</span>
                    </div>
                    <div className="text-[#8b8e99]">
                      <strong className="text-[#ffd000]">{pos.sold_count}</strong> sold
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6 bg-[#18191f] border border-[#262833] shadow-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ffd000]" /> Recent Transactions
              </h3>

              {recentPurchases.length > 0 ? (
                <div className="space-y-2.5 font-mono">
                  {recentPurchases.slice(0, 5).map((pur) => (
                    <div
                      key={pur.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#111215] border border-[#262833] text-xs"
                    >
                      <div>
                        <div className="font-bold text-white font-sans">{pur.player_name}</div>
                        <div className="text-[10px]" style={{ color: pur.team_color }}>
                          {pur.team_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-[#ffd000]">
                          {formatMoney(pur.purchase_price)}
                        </div>
                        <div className="text-[9px] text-[#6b6e7a]">
                          {pur.transaction_number || 'TX'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[#8b8e99] text-xs">
                  No auction transactions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD TEAM ================= */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191f] rounded-2xl p-6 max-w-lg w-full border border-[#2a2d3a] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#ffd000]" /> Register New Franchise
              </h3>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="w-8 h-8 rounded bg-[#111215] text-[#8b8e99] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Franchise Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thunderbolts FC"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ffd000]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Short Tag (3-4 chars)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. TBD"
                    value={teamForm.short_name}
                    onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value.toUpperCase() })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white uppercase font-bold outline-none focus:border-[#ffd000]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Initial Purse (₹)</label>
                  <input
                    type="number"
                    required
                    step="1000"
                    value={teamForm.initial_purse_rupees}
                    onChange={(e) => setTeamForm({ ...teamForm, initial_purse_rupees: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#ffd000]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Max Squad Slots</label>
                  <input
                    type="number"
                    required
                    value={teamForm.max_squad_size}
                    onChange={(e) => setTeamForm({ ...teamForm, max_squad_size: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#ffd000]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={teamForm.primary_color}
                      onChange={(e) => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                      className="w-9 h-9 rounded border border-[#262833] bg-[#111215] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={teamForm.primary_color}
                      onChange={(e) => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                      className="flex-1 bg-[#111215] border border-[#262833] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Captain Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Captain Thunder"
                    value={teamForm.captain_name}
                    onChange={(e) => setTeamForm({ ...teamForm, captain_name: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ffd000]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#262833] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#111215] text-xs font-bold text-[#8b8e99] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#ffd000] text-[#0a0b0d] text-xs font-black uppercase tracking-wider hover:bg-[#facc15] shadow cursor-pointer"
                >
                  Save Franchise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: FIX TEAM PURSE ================= */}
      {fixingTeamPurse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191f] rounded-2xl p-6 max-w-md w-full border-2 border-[#ffd000] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#ffd000]" /> Fix / Edit Purse Amount
              </h3>
              <button
                onClick={() => setFixingTeamPurse(null)}
                className="w-8 h-8 rounded bg-[#111215] text-[#8b8e99] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFixPurse} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#111215] border border-[#262833] space-y-1">
                <div className="text-xs font-black text-white uppercase">{fixingTeamPurse.name}</div>
                <div className="text-[11px] text-[#8b8e99] font-mono">
                  Already Spent: <strong className="text-rose-400">{formatMoney(fixingTeamPurse.totalSpent || 0)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8b8e99] mb-1">
                  New Total Initial Purse (in ₹)
                </label>
                <input
                  type="number"
                  required
                  step="500"
                  value={newPurseAmountRupees}
                  onChange={(e) => setNewPurseAmountRupees(e.target.value)}
                  className="w-full bg-[#111215] border-2 border-[#ffd000] rounded-xl px-4 py-3 text-lg font-black text-[#ffd000] font-mono outline-none"
                />
                <span className="text-[10px] text-[#6b6e7a] block mt-1">
                  Must be greater than current spent amount ({formatMoney(fixingTeamPurse.totalSpent || 0)}).
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFixingTeamPurse(null)}
                  className="px-4 py-2 rounded-lg bg-[#111215] text-xs font-bold text-[#8b8e99]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] text-xs font-black uppercase tracking-wider shadow cursor-pointer"
                >
                  Update &amp; Lock Purse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PLAYER ================= */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191f] rounded-2xl p-6 max-w-xl w-full border border-[#2a2d3a] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ffd000]" /> Register New Player Lot
              </h3>
              <button
                onClick={() => setShowAddPlayerModal(false)}
                className="w-8 h-8 rounded bg-[#111215] text-[#8b8e99] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlayer} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Full Player Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Mehta"
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ffd000]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Primary Position</label>
                  <select
                    value={playerForm.primary_position}
                    onChange={(e) => setPlayerForm({ ...playerForm, primary_position: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-bold"
                  >
                    {['ST', 'CF', 'RW', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={playerForm.base_price_rupees}
                    onChange={(e) => setPlayerForm({ ...playerForm, base_price_rupees: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#ffd000]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Overall Rating (OVR)</label>
                  <input
                    type="number"
                    min="50"
                    max="99"
                    value={playerForm.overall_rating}
                    onChange={(e) => setPlayerForm({ ...playerForm, overall_rating: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Category</label>
                  <select
                    value={playerForm.category}
                    onChange={(e) => setPlayerForm({ ...playerForm, category: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="star">Star / Marquee</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 pt-1">
                {['speed', 'shooting', 'passing', 'dribbling', 'defensive', 'physical'].map((stat) => (
                  <div key={stat}>
                    <label className="block text-[9px] text-[#8b8e99] uppercase font-bold mb-0.5 truncate">{stat.slice(0, 3).toUpperCase()}</label>
                    <input
                      type="number"
                      min="40"
                      max="99"
                      value={playerForm[`${stat}_rating`]}
                      onChange={(e) => setPlayerForm({ ...playerForm, [`${stat}_rating`]: e.target.value })}
                      className="w-full bg-[#111215] border border-[#262833] rounded px-1.5 py-1 text-center text-xs text-white font-mono"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Photo Cutout URL</label>
                <input
                  type="text"
                  placeholder="https://... or /uploads/..."
                  value={playerForm.photo_url}
                  onChange={(e) => setPlayerForm({ ...playerForm, photo_url: e.target.value })}
                  className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ffd000]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Assign Initial Badges</label>
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((b) => {
                    const selected = playerForm.selectedBadges.includes(b.name);
                    return (
                      <button
                        type="button"
                        key={b.id || b.code}
                        onClick={() => {
                          const list = selected
                            ? playerForm.selectedBadges.filter(name => name !== b.name)
                            : [...playerForm.selectedBadges, b.name];
                          setPlayerForm({ ...playerForm, selectedBadges: list });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                          selected
                            ? 'bg-[#ffd000] text-[#0a0b0d]'
                            : 'bg-[#111215] text-[#8b8e99] border border-[#262833]'
                        }`}
                      >
                        {selected ? `✓ ${b.name}` : `+ ${b.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#262833] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#111215] text-xs font-bold text-[#8b8e99]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] text-xs font-black uppercase tracking-wider shadow cursor-pointer"
                >
                  Register Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD BADGE ================= */}
      {showAddBadgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191f] rounded-2xl p-6 max-w-md w-full border border-[#2a2d3a] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Award className="w-5 h-5 text-[#ffd000]" /> Create Custom Badge
              </h3>
              <button
                onClick={() => setShowAddBadgeModal(false)}
                className="w-8 h-8 rounded bg-[#111215] text-[#8b8e99] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBadge} className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Badge Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannon Shot or Tiki-Taka"
                  value={badgeForm.name}
                  onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                  className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ffd000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Category</label>
                  <select
                    value={badgeForm.category}
                    onChange={(e) => setBadgeForm({ ...badgeForm, category: e.target.value })}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="playstyle">Playstyle</option>
                    <option value="award">Tournament Award</option>
                    <option value="striker">Striker</option>
                    <option value="midfield">Midfield</option>
                    <option value="defense">Defense</option>
                    <option value="goalkeeper">Goalkeeper</option>
                    <option value="leadership">Leadership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badgeForm.color}
                      onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })}
                      className="w-8 h-8 rounded bg-[#111215] border border-[#262833] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={badgeForm.color}
                      onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })}
                      className="flex-1 bg-[#111215] border border-[#262833] rounded px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What makes this badge special..."
                  value={badgeForm.description}
                  onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                  className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBadgeModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#111215] text-xs font-bold text-[#8b8e99]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] text-xs font-black uppercase tracking-wider shadow cursor-pointer"
                >
                  Create Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EA FC PLAYER CARD PREVIEW ================= */}
      {previewPlayerCard && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#18191f] rounded-3xl p-6 max-w-md w-full border border-[#2a2d3a] shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ffd000]" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Generated EA FC Player Card
                </h3>
              </div>
              <button
                onClick={() => setPreviewPlayerCard(null)}
                className="w-8 h-8 rounded-xl bg-[#111215] hover:bg-[#22242d] text-[#8b8e99] hover:text-white flex items-center justify-center font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center py-2">
              <PlayerCard
                player={previewPlayerCard}
                size="md"
                showPrice={true}
                showStats={true}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#111215] border border-[#262833] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#8b8e99] uppercase text-[10px]">Registered Name:</span>
                <span className="font-bold text-white font-sans">{previewPlayerCard.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8b8e99] uppercase text-[10px]">Playstyle Badges:</span>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {Array.isArray(previewPlayerCard.badges) && previewPlayerCard.badges.length > 0 ? (
                    previewPlayerCard.badges.map((b, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-[#ffd000]/10 border border-[#ffd000]/30 text-[#ffd000] text-[9px] font-bold">
                        {b}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#6b6e7a]">Finisher++</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8b8e99] uppercase text-[10px]">Starting Base Price:</span>
                <span className="font-black text-[#ffd000]">{formatMoney(previewPlayerCard.base_price)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewPlayerCard(null)}
                className="w-full py-2.5 rounded-xl bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] text-xs font-black uppercase tracking-wider shadow cursor-pointer transition text-center"
              >
                Done / Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
