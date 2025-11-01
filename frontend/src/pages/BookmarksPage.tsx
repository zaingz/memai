import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmarks, useCreateBookmark, useDeleteBookmark } from '@/hooks/api/bookmarks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

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
              <p className="text-center text-muted-foreground">Loading bookmarks...</p>
            ) : bookmarks && (bookmarks as any).bookmarks?.length > 0 ? (
              (bookmarks as any).bookmarks.map((bookmark: any) => (
                <Card key={bookmark.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{bookmark.title || bookmark.url}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{bookmark.url}</p>
                        <div className="flex gap-2">
                          <Badge>{bookmark.source}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(bookmark.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBookmark.mutate(bookmark.id)}
                        disabled={deleteBookmark.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
