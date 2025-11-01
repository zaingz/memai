import { useAuth } from '@/contexts/AuthContext';
import { useDigests, useGenerateDigest } from '@/hooks/api/digests';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export function DigestsPage() {
  const { signOut } = useAuth();
  const { data: digests, isLoading } = useDigests();
  const generateDigest = useGenerateDigest();

  const handleGenerate = async () => {
    try {
      await generateDigest.mutateAsync({
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Failed to generate digest:', error);
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
          {/* Generate digest */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Digests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Generate an AI-powered summary of today's bookmarks
                </p>
                <Button onClick={handleGenerate} disabled={generateDigest.isPending}>
                  {generateDigest.isPending ? 'Generating...' : 'Generate Today\'s Digest'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Digests list */}
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading digests...</p>
            ) : digests && (digests as any).digests?.length > 0 ? (
              (digests as any).digests.map((digest: any) => (
                <Card key={digest.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {new Date(digest.digest_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </h3>
                          <div className="flex gap-2 mt-2">
                            <Badge>{digest.bookmark_count} bookmarks</Badge>
                            <Badge variant={digest.status === 'completed' ? 'default' : 'secondary'}>
                              {digest.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {digest.digest_content && (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-muted-foreground line-clamp-3">
                            {digest.digest_content.substring(0, 200)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No digests yet. Generate your first one above!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
