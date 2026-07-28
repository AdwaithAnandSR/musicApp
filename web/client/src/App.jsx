import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  Layers,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Download,
  AlertTriangle,
  Terminal,
  Library,
  History,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap,
  StopCircle,
  CloudUpload,
  Cloud
} from 'lucide-react';

export default function App() {
  // Input form state
  const [url, setUrl] = useState('');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // WebSocket & Active Job state
  const [wsConnected, setWsConnected] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const [jobsHistory, setJobsHistory] = useState([]);
  const [localMetadata, setLocalMetadata] = useState([]);
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('pipeline');
  const [playingTrack, setPlayingTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const terminalEndRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (activeTab === 'logs' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  // Connect to WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    let socket;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWsEvent(data);
        } catch (e) {
          console.error('WS JSON parse error', e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = () => {
        setWsConnected(false);
      };
    } catch (err) {
      setWsConnected(false);
    }

    // Fetch initial status, history & metadata
    checkHealth();
    fetchJobsHistory();
    fetchLocalMetadata();

    return () => {
      if (socket) socket.close();
    };
  }, []);

  useEffect(() => {
    if (!currentJobId) return;

    const interval = setInterval(() => {
      fetchJobDetails(currentJobId);
      fetchLocalMetadata();
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJobId]);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setCloudinaryConfigured(Boolean(data.cloudinaryConfigured));
      }
    } catch (e) {
      console.error('Health check failed', e);
    }
  };

  const fetchJobsHistory = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobsHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch jobs history', e);
    }
  };

  const fetchLocalMetadata = async () => {
    try {
      const res = await fetch('/api/metadata');
      if (res.ok) {
        const data = await res.json();
        setLocalMetadata(data);
      }
    } catch (e) {
      console.error('Failed to fetch local metadata', e);
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJobDetails(data);
      }
    } catch (e) {
      console.error('Failed to fetch job details', e);
    }
  };

  const handleWsEvent = (event) => {
    const { type, payload } = event;

    switch (type) {
      case 'JOB_CREATED':
      case 'JOB_STARTED':
      case 'ITEM_STATUS_CHANGED':
      case 'JOB_FINISHED':
      case 'JOB_FAILED':
      case 'JOB_CANCELLED':
        if (payload && payload.jobId) {
          fetchJobDetails(payload.jobId);
          fetchJobsHistory();
          fetchLocalMetadata();
        }
        break;

      case 'JOB_LOG':
        if (payload && payload.log) {
          setLogs((prev) => [...prev, payload.log]);
        }
        break;

      default:
        break;
    }
  };

  const handleSubmitMigration = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg('Please enter a valid YouTube URL or array of URLs (e.g. ["url1", "url2"]).');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    setLogs([]);

    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          skip: parseInt(skip, 10) || 0,
          limit: parseInt(limit, 10) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit migration job');
      }

      setCurrentJobId(data.jobId);
      setActiveTab('pipeline');
      fetchJobDetails(data.jobId);
      fetchJobsHistory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!currentJobId) return;
    try {
      await fetch(`/api/jobs/${currentJobId}/cancel`, { method: 'POST' });
      fetchJobDetails(currentJobId);
    } catch (e) {
      console.error('Cancel job error', e);
    }
  };

  const playAudio = (track) => {
    const songUrl = track.songUrl || track.cloudinarySongUrl || `/${track.songPath}`;
    const coverUrl = track.coverUrl || track.cloudinaryCoverUrl || (track.coverPath ? `/${track.coverPath}` : track.thumbnail);

    if (playingTrack?.ytId === track.ytId) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setPlayingTrack({ ...track, songUrl, coverUrl });
      setIsPlaying(true);
      setTimeout(() => {
        audioRef.current?.play();
      }, 50);
    }
  };

  // Helper calculations
  const items = jobDetails?.items || [];
  const totalCount = items.length;
  const pendingCount = items.filter(i => i.status === 'PENDING').length;
  const checkingCount = items.filter(i => i.status === 'CHECKING_DB').length;
  const downloadingCount = items.filter(i => i.status === 'DOWNLOADING').length;
  const uploadingCloudinaryCount = items.filter(i => i.status === 'UPLOADING_CLOUDINARY').length;
  const registeringDbCount = items.filter(i => i.status === 'REGISTERING_DB').length;
  const skippedCount = items.filter(i => i.status === 'SKIPPED').length;
  const completedCount = items.filter(i => i.status === 'COMPLETED').length;
  const failedCount = items.filter(i => i.status === 'FAILED').length;
  const processedCount = skippedCount + completedCount + failedCount;

  const percent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <Music size={26} />
          </div>
          <div>
            <div className="brand-title">VividMusic Migration Studio</div>
            <div className="brand-subtitle">Pre-flight Deduplication • Cloudinary Upload • Database Sync</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="ws-badge">
            {cloudinaryConfigured ? (
              <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={16} /> Cloudinary Active (.env)
              </span>
            ) : (
              <span style={{ color: 'var(--status-skipped)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CloudUpload size={16} /> Cloudinary: Not Set (.env)
              </span>
            )}
          </div>

          <div className="ws-badge">
            <div className={`ws-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
            {wsConnected ? 'Live Connection' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Input Card */}
      <div className="card">
        <div className="card-title">
          <Zap size={20} style={{ color: 'var(--accent-cyan)' }} />
          New Migration Task
        </div>

        <form onSubmit={handleSubmitMigration} className="form-grid">
          <div className="form-group">
            <label className="form-label">YouTube Video / Playlist / Channel URL(s)</label>
            <textarea
              rows={3}
              className="form-input"
              placeholder='Single URL, JSON array ["url1", "url2"], or line-separated URLs'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Skip (Offset)</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={skip}
              onChange={(e) => setSkip(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Limit (Count)</label>
            <input
              type="number"
              min="0"
              className="form-input"
              placeholder="0 = all"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? (
              <>
                <RefreshCw size={18} className="spinning" />
                Extracting...
              </>
            ) : (
              <>
                <Download size={18} />
                Start Pipeline
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div style={{ color: 'var(--status-failed)', marginTop: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {errorMsg}
          </div>
        )}

        <div className="quick-links">
          <span>Preset Sample Inputs:</span>
          <span
            className="chip"
            onClick={() => setUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
          >
            Single Video
          </span>
          <span
            className="chip"
            onClick={() => setUrl('["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=jNQXAC9IVRw"]')}
          >
            URLs Array [l1, l2]
          </span>
          <span
            className="chip"
            onClick={() => setUrl('https://www.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0Aq_Lm0g')}
          >
            Playlist Sample
          </span>
        </div>
      </div>

      {/* Real-time Dashboard Metrics */}
      {jobDetails && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-title" style={{ margin: 0 }}>
              <Layers size={20} style={{ color: 'var(--accent-blue)' }} />
              Active Job Dashboard: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{jobDetails.id}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className={`badge badge-${jobDetails.status.toLowerCase()}`}>
                {jobDetails.status}
              </span>
              {jobDetails.status === 'PROCESSING' && (
                <button
                  onClick={handleCancelJob}
                  className="tab-btn"
                  style={{ color: 'var(--status-failed)', borderColor: 'var(--status-failed)' }}
                >
                  <StopCircle size={16} /> Cancel
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-header">
              <span>Overall Progress</span>
              <span>{percent}% ({processedCount} / {totalCount} Processed)</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>

          {/* Status Breakdown Cards */}
          <div className="stats-grid">
            <div className="stat-card" style={{ '--stat-color': 'var(--text-muted)' }}>
              <div className="stat-title">Total Tracks</div>
              <div className="stat-value">{totalCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--status-pending)' }}>
              <div className="stat-title">Pending</div>
              <div className="stat-value">{pendingCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--status-checking)' }}>
              <div className="stat-title">Checking DB</div>
              <div className="stat-value">{checkingCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--status-downloading)' }}>
              <div className="stat-title">Downloading (Max 2)</div>
              <div className="stat-value">{downloadingCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--accent-cyan)' }}>
              <div className="stat-title">Cloudinary Upload</div>
              <div className="stat-value">{uploadingCloudinaryCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--accent-purple)' }}>
              <div className="stat-title">Registering DB</div>
              <div className="stat-value">{registeringDbCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--status-skipped)' }}>
              <div className="stat-title">Skipped (Exists)</div>
              <div className="stat-value">{skippedCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--status-completed)' }}>
              <div className="stat-title">Completed</div>
              <div className="stat-value">{completedCount}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': 'var(--status-failed)' }}>
              <div className="stat-title">Failed</div>
              <div className="stat-value">{failedCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          <Radio size={16} /> Live Pipeline View
        </button>
        <button
          className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('library');
            fetchLocalMetadata();
          }}
        >
          <Library size={16} /> Processed Tracks Library ({localMetadata.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Terminal size={16} /> Live Console Logs ({logs.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            fetchJobsHistory();
          }}
        >
          <History size={16} /> Job History ({jobsHistory.length})
        </button>
      </div>

      {/* TAB 1: Live Pipeline View */}
      {activeTab === 'pipeline' && (
        <div className="card">
          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Track Information</th>
                  <th>YouTube ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No active migration pipeline tasks running. Submit a YouTube link above to start.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.ytId}>
                      <td>
                        <div className="track-info">
                          <img
                            src={item.coverUrl || item.thumbnail || `https://img.youtube.com/vi/${item.ytId}/hqdefault.jpg`}
                            alt={item.title}
                            className="cover-thumb"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/48?text=🎵'; }}
                          />
                          <div>
                            <div className="track-title">{item.title}</div>
                            <div className="track-artist">{item.channel || 'Unknown Artist'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {item.ytId}
                      </td>
                      <td>
                        <span className={`badge badge-${item.status.toLowerCase()}`}>
                          {item.status === 'CHECKING_DB' && <Database size={12} className="spinning" />}
                          {item.status === 'DOWNLOADING' && <Download size={12} className="spinning" />}
                          {item.status === 'UPLOADING_CLOUDINARY' && <CloudUpload size={12} className="spinning" />}
                          {item.status === 'REGISTERING_DB' && <Database size={12} className="spinning" />}
                          {item.status === 'SKIPPED' && <CheckCircle2 size={12} />}
                          {item.status === 'COMPLETED' && <CheckCircle2 size={12} />}
                          {item.status === 'FAILED' && <XCircle size={12} />}
                          {item.status}
                        </span>
                        {item.error && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--status-failed)', marginTop: '4px' }}>
                            {item.error}
                          </div>
                        )}
                      </td>
                      <td>
                        {item.status === 'COMPLETED' && (item.songUrl || item.songPath) && (
                          <button
                            className="chip"
                            onClick={() => playAudio(item)}
                          >
                            <Play size={14} /> Listen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Processed Tracks Library */}
      {activeTab === 'library' && (
        <div className="card">
          <div className="card-title">
            <Library size={20} style={{ color: 'var(--accent-cyan)' }} />
            Processed & Registered Songs Index
          </div>

          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Song</th>
                  <th>YouTube ID</th>
                  <th>Cloudinary Audio URL</th>
                  <th>Downloaded Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {localMetadata.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No tracks processed yet.
                    </td>
                  </tr>
                ) : (
                  localMetadata.map((track) => (
                    <tr key={track.ytId}>
                      <td>
                        <div className="track-info">
                          <img
                            src={track.cloudinaryCoverUrl || (track.coverPath ? `/${track.coverPath}` : `https://img.youtube.com/vi/${track.ytId}/hqdefault.jpg`)}
                            alt={track.title}
                            className="cover-thumb"
                          />
                          <div>
                            <div className="track-title">{track.title}</div>
                            <div className="track-artist">{track.channel}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{track.ytId}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.cloudinarySongUrl || track.songPath || 'N/A'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(track.downloadedAt || Date.now()).toLocaleString()}
                      </td>
                      <td>
                        <button className="chip" onClick={() => playAudio(track)}>
                          {playingTrack?.ytId === track.ytId && isPlaying ? <Pause size={14} /> : <Play size={14} />} Listen Audio
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Live Console Logs */}
      {activeTab === 'logs' && (
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Terminal size={20} style={{ color: 'var(--accent-cyan)' }} />
              Pipeline Execution Log Output
            </div>
            <button className="chip" onClick={() => setLogs([])}>Clear Console</button>
          </div>

          <div className="terminal-window">
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>Waiting for log stream...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`log-line ${log.level || 'info'}`}>
                  <span className="log-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  {log.message}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* TAB 4: Job History */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-title">
            <History size={20} style={{ color: 'var(--accent-purple)' }} />
            Migration Jobs History
          </div>

          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>YouTube URL</th>
                  <th>Status</th>
                  <th>Counts (Completed / Skipped / Failed)</th>
                  <th>Created At</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {jobsHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No past migration jobs found.
                    </td>
                  </tr>
                ) : (
                  jobsHistory.map((j) => (
                    <tr key={j.id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{j.id}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {j.url}
                      </td>
                      <td>
                        <span className={`badge badge-${j.status.toLowerCase()}`}>{j.status}</span>
                      </td>
                      <td>
                        {j.completedCount} completed • {j.skippedCount} skipped • {j.failedCount} failed
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(j.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="chip"
                          onClick={() => {
                            setCurrentJobId(j.id);
                            fetchJobDetails(j.id);
                            setActiveTab('pipeline');
                          }}
                        >
                          View Job <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fixed Bottom Audio Player */}
      {playingTrack && (
        <div className="audio-player-bar">
          <div className="player-info">
            <img
              src={playingTrack.coverUrl || `https://img.youtube.com/vi/${playingTrack.ytId}/hqdefault.jpg`}
              alt={playingTrack.title}
              className="cover-thumb"
            />
            <div>
              <div className="track-title">{playingTrack.title}</div>
              <div className="track-artist" style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {playingTrack.songUrl}
              </div>
            </div>
          </div>

          <div className="player-controls">
            <audio
              ref={audioRef}
              controls
              src={playingTrack.songUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
