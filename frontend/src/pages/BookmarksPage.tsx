import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmarks, useCreateBookmark, useDeleteBookmark, useBookmarkDetails } from '@/hooks/api/bookmarks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// Bookmark item component with expand/collapse
function BookmarkItem({ bookmark, onDelete }: { bookmark: any; onDelete: (id: number) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: details, isLoading: isLoadingDetails } = useBookmarkDetails(
    isExpanded ? bookmark.id : 0
  );

  const transcription = (details as any)?.transcription;
  const hasTranscription = bookmark.source === 'youtube';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header - always visible */}
          <div className="flex justify-between items-start">
            <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex items-start gap-2">
                <h3 className="font-semibold flex-1">{bookmark.title || bookmark.url}</h3>
                {hasTranscription && (
                  <button className="text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{bookmark.url}</p>
              <div className="flex gap-2 mt-2">
                <Badge>{bookmark.source}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(bookmark.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(bookmark.id)}
            >
              Delete
            </Button>
          </div>

          {/* Expanded details - shown when clicked */}
          {isExpanded && hasTranscription && (
            <div className="pt-3 border-t">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading summary...</span>
                </div>
              ) : transcription ? (
                <div className="space-y-4">
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      transcription.status === 'completed' ? 'default' :
                      transcription.status === 'processing' ? 'secondary' :
                      transcription.status === 'failed' ? 'destructive' : 'outline'
                    }>
                      {transcription.status}
                    </Badge>
                    {transcription.duration && (
                      <span className="text-sm text-muted-foreground">
                        {Math.floor(transcription.duration / 60)}:{String(Math.floor(transcription.duration % 60)).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* OpenAI Summary */}
                  {transcription.summary && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">AI Summary</h4>
                      <p className="text-sm leading-relaxed">{transcription.summary}</p>
                    </div>
                  )}

                  {/* Deepgram Summary */}
                  {transcription.deepgram_summary && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Quick Summary</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{transcription.deepgram_summary}</p>
                    </div>
                  )}

                  {/* Sentiment */}
                  {transcription.sentiment && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Sentiment:</span>
                      <Badge variant="outline">{transcription.sentiment}</Badge>
                      {transcription.sentiment_score && (
                        <span className="text-xs text-muted-foreground">
                          ({(transcription.sentiment_score * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Transcript */}
                  {transcription.transcript && (
                    <details className="text-sm">
                      <summary className="font-semibold cursor-pointer mb-2">Full Transcript</summary>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {transcription.transcript}
                      </p>
                    </details>
                  )}

                  {/* Processing state */}
                  {(transcription.status === 'processing' || transcription.status === 'pending') && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transcription in progress...</span>
                    </div>
                  )}

                  {/* Error state */}
                  {transcription.status === 'failed' && transcription.error_message && (
                    <div className="text-sm text-destructive">
                      Error: {transcription.error_message}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No transcription data available yet.</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BookmarksPage() {
  const { signOut } = useAuth();
  const { data: bookmarks, isLoading } = useBookmarks();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();
  const [url, setUrl] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    try {
      await createBookmark.mutateAsync({
        url,
        source: 'web',
        client_time: new Date().toISOString(),
      });
      setUrl('');
    } catch (error) {
      console.error('Failed to create bookmark:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to="/dashboard"><h1 className="text-2xl font-bold">MemAI</h1></Link>
            <nav className="flex gap-4">
              <Link to="/bookmarks"><Button variant="ghost">Bookmarks</Button></Link>
              <Link to="/digests"><Button variant="ghost">Digests</Button></Link>
            </nav>
          </div>
          <Button onClick={() => signOut()} variant="outline">Sign out</Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Add bookmark form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Bookmark</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="flex gap-2">
                <Input
                  placeholder="Paste URL (YouTube, article, etc.)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={createBookmark.isPending}
                />
                <Button type="submit" disabled={createBookmark.isPending || !url}>
                  {createBookmark.isPending ? 'Adding...' : 'Add'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Bookmarks list */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading bookmarks...</span>
              </div>
            ) : bookmarks && (bookmarks as any).bookmarks?.length > 0 ? (
              (bookmarks as any).bookmarks.map((bookmark: any) => (
                <BookmarkItem
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={(id) => deleteBookmark.mutate(id)}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No bookmarks yet. Add your first one above!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
