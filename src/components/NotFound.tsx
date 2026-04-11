import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="space-y-2 p-2">
      <div className="text-muted-foreground">
        {children || <p>The page you are looking for does not exist.</p>}
      </div>
      <p className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link to="/">Start Over</Link>
        </Button>
      </p>
    </div>
  );
}
