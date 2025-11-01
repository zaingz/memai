import { useAuth } from '@/contexts/AuthContext';
import { useBookmarks } from '@/hooks/api/bookmarks';
import { useDigests } from '@/hooks/api/digests';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const { data: bookmarks, isLoading: bookmarksLoading } = useBookmarks({ limit: 5 });
  const { data: digests, isLoading: digestsLoading } = useDigests({ limit: 3 });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">MemAI Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button onClick={() => signOut()} variant="outline">Sign out</Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Bookmarks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookmarks</CardTitle>
              <CardDescription>Your latest saved content</CardDescription>
            </CardHeader>
            <CardContent>
              {bookmarksLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : bookmarks && (bookmarks as any).bookmarks?.length > 0 ? (
                <div className="space-y-2">
                  {(bookmarks as any).bookmarks.map((bookmark: any) => (
                    <div key={bookmark.id} className="p-2 border rounded hover:bg-accent">
                      <p className="font-medium">{bookmark.title || bookmark.url}</p>
                      <p className="text-sm text-muted-foreground">{bookmark.source}</p>
                    </div>
                  ))}
                  <Link to="/bookmarks">
                    <Button variant="link" className="p-0">View all →</Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No bookmarks yet</p>
                  <Link to="/bookmarks">
                    <Button>Add your first bookmark</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Digests */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Digests</CardTitle>
              <CardDescription>Your AI-powered content summaries</CardDescription>
            </CardHeader>
            <CardContent>
              {digestsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : digests && (digests as any).digests?.length > 0 ? (
                <div className="space-y-2">
                  {(digests as any).digests.map((digest: any) => (
                    <div key={digest.id} className="p-2 border rounded hover:bg-accent">
                      <p className="font-medium">{new Date(digest.digest_date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">{digest.bookmark_count} bookmarks</p>
                    </div>
                  ))}
                  <Link to="/digests">
                    <Button variant="link" className="p-0">View all →</Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No digests yet</p>
                  <Link to="/digests">
                    <Button>Generate digest</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
