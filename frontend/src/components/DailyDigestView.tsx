import { useState, useEffect } from 'react';
import type { DailyDigest } from '../types';
import { generateDailyDigest, getDailyDigest, listDailyDigests } from '../lib/api';

interface DailyDigestViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyDigestView({ isOpen, onClose }: DailyDigestViewProps) {
  const [digests, setDigests] = useState<DailyDigest[]>([]);
  const [selectedDigest, setSelectedDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDigests();
    }
  }, [isOpen]);

  const loadDigests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listDailyDigests(10, 0);
      setDigests(response.digests);
      if (response.digests.length > 0) {
        setSelectedDigest(response.digests[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load digests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDigest = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateDailyDigest();
      setSelectedDigest(response.digest);
      await loadDigests(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to generate digest');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      completed: 'rgba(34, 197, 94, 0.15)',
      pending: 'rgba(234, 179, 8, 0.15)',
      processing: 'rgba(59, 130, 246, 0.15)',
      failed: 'rgba(239, 68, 68, 0.15)',
    };
    const statusTextColors = {
      completed: '#86efac',
      pending: '#fde047',
      processing: '#93c5fd',
      failed: '#fca5a5',
    };

    return (
      <span
        style={{
          padding: '0.35rem 0.7rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          background: statusColors[status as keyof typeof statusColors] || statusColors.pending,
          color: statusTextColors[status as keyof typeof statusTextColors] || statusTextColors.pending,
          border: '1px solid currentColor',
        }}
      >
        {status}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Daily Digests</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleGenerateDigest}
              disabled={isGenerating}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.9))',
                color: 'white',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.6 : 1,
              }}
            >
              {isGenerating ? 'Generating...' : '+ Generate Today'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="loading" style={{ justifyContent: 'center', marginTop: '2rem' }}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
            {/* Left sidebar - digest list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'rgba(148, 163, 184, 0.85)', margin: '0 0 0.5rem' }}>
                Recent Digests
              </h3>
              {digests.length === 0 ? (
                <p className="muted" style={{ fontSize: '0.875rem' }}>
                  No digests yet. Generate your first one!
                </p>
              ) : (
                digests.map((digest) => (
                  <button
                    key={digest.id}
                    onClick={() => setSelectedDigest(digest)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: selectedDigest?.id === digest.id
                        ? '1px solid rgba(59, 130, 246, 0.55)'
                        : '1px solid rgba(148, 163, 184, 0.12)',
                      background: selectedDigest?.id === digest.id
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(15, 23, 42, 0.6)',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {formatDate(digest.digest_date)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="muted" style={{ fontSize: '0.75rem' }}>
                        {digest.bookmark_count} bookmarks
                      </span>
                      {getStatusBadge(digest.status)}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Right panel - digest content */}
            <div>
              {selectedDigest ? (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                      {formatDate(selectedDigest.digest_date)}
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {getStatusBadge(selectedDigest.status)}
                      <span className="muted" style={{ fontSize: '0.875rem' }}>
                        {selectedDigest.bookmark_count} bookmarks
                      </span>
                    </div>
                  </div>

                  {selectedDigest.sources_breakdown && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'rgba(148, 163, 184, 0.85)', marginBottom: '0.75rem' }}>
                        Sources
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {Object.entries(selectedDigest.sources_breakdown).map(([source, count]) => (
                          count ? (
                            <span
                              key={source}
                              style={{
                                padding: '0.35rem 0.7rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#93c5fd',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                              }}
                            >
                              {source}: {count}
                            </span>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDigest.status === 'completed' && selectedDigest.digest_content ? (
                    <div>
                      <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'rgba(148, 163, 184, 0.85)', marginBottom: '0.75rem' }}>
                        Summary
                      </h4>
                      <div
                        style={{
                          padding: '1.5rem',
                          borderRadius: '12px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.12)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                        }}
                      >
                        {selectedDigest.digest_content}
                      </div>
                    </div>
                  ) : selectedDigest.status === 'failed' ? (
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#fca5a5',
                      }}
                    >
                      <strong>Generation failed:</strong> {selectedDigest.error_message || 'Unknown error'}
                    </div>
                  ) : (
                    <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                      Digest is {selectedDigest.status}...
                    </div>
                  )}
                </div>
              ) : (
                <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                  Select a digest to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
