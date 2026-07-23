import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type RegionJson } from '@/lib/regions/store';

export function RegionCard({
  region,
  onChange,
  onDelete,
}: {
  region: RegionJson;
  onChange: (next: RegionJson) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(region.name);
  const [emoji, setEmoji] = useState(region.emoji);
  const [keywords, setKeywords] = useState(region.keywords);
  const [error, setError] = useState<string | null>(null);

  const validateRegex = (pattern: string): boolean => {
    try {
      new RegExp(pattern, 'i');
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '无效正则');
      return false;
    }
  };

  const handleSave = () => {
    if (!validateRegex(keywords)) return;
    onChange({ name, emoji, keywords, flags: 'i' });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(region.name);
    setEmoji(region.emoji);
    setKeywords(region.keywords);
    setError(null);
    setEditing(false);
  };

  return (
    <Card className="p-4 glass border-border/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editing ? (
            <Input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-12 text-center text-lg p-1 bg-background/50 h-8"
            />
          ) : (
            <span className="text-2xl">{region.emoji}</span>
          )}
          {editing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-semibold text-sm h-8 bg-background/50"
            />
          ) : (
            <h3 className="font-semibold text-base">{region.name}</h3>
          )}
        </div>

        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="default" onClick={handleSave} className="h-7 text-xs cursor-pointer">
                保存
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs cursor-pointer">
                取消
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 text-xs cursor-pointer">
                ✏️ 编辑
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 text-xs text-destructive hover:text-destructive cursor-pointer">
                🗑️
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">识别关键字正则 (JavaScript RegExp)</label>
        {editing ? (
          <div>
            <Input
              value={keywords}
              onChange={(e) => {
                setKeywords(e.target.value);
                validateRegex(e.target.value);
              }}
              className="font-mono text-xs bg-background/50"
            />
            {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
          </div>
        ) : (
          <code className="block p-2 rounded bg-background/40 font-mono text-xs text-primary/90 break-all">
            /{region.keywords}/i
          </code>
        )}
      </div>
    </Card>
  );
}
