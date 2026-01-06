
import { Card, CardContent, Badge } from "@/components/ui";

// The original file used a div. I'll make the whole card clickable or add a view button.
// Actually, let's look at the original ScenarioCard code again in step 14.
// It uses Card which has hover prop.
import { Map, User } from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  description: string;
  genre: string;
  difficulty: string;
  isOfficial: boolean;
  isAIGenerated: boolean;
  tags: any; // handling JSON from DB
  creator?: {
    username?: string | null;
  };
}

const difficultyColors = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
} as const;

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  // Parse tags if they are string
  const tags = typeof scenario.tags === 'string' ? JSON.parse(scenario.tags) : scenario.tags;
  
  return (
    <Card hover className="h-full group cursor-pointer transition-all hover:-translate-y-1">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20 rounded-t-xl flex items-center justify-center">
        <Map className="h-12 w-12 text-primary/50 group-hover:scale-110 transition-transform" />
        <div className="absolute top-3 right-3 flex gap-2">
          {scenario.isOfficial && (
            <Badge variant="primary" size="sm">
              Resmi
            </Badge>
          )}
          {scenario.isAIGenerated && (
            <Badge variant="secondary" size="sm">
              AI
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="pt-4">
        {/* Title */}
        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
          {scenario.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-foreground-secondary line-clamp-3 mb-4">
          {scenario.description}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">{scenario.genre}</Badge>
          <Badge
            variant={difficultyColors[scenario.difficulty as keyof typeof difficultyColors] || "default"}
          >
            {scenario.difficulty}
          </Badge>
        </div>

        {scenario.creator?.username && (
          <div className="flex items-center gap-1 text-xs text-foreground-muted mb-3">
            <User className="h-3 w-3" />
            <span>Oluşturan: {scenario.creator.username}</span>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-background-elevated text-foreground-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
