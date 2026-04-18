import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { fetchTagsQueryOptions } from "~/features/tags/queries";

export const Route = createFileRoute("/_app/tags")({
  head: () => ({
    meta: [{ title: "Tags - whatIdid" }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(fetchTagsQueryOptions());
    return null;
  },
  component: Tags,
});

function Tags() {
  const { data: tags = [] } = useQuery(fetchTagsQueryOptions());
  const [search, setSearch] = useState("");

  const filtered = search
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tags;

  return (
    <div className="flex min-h-full flex-col justify-center">
      <section>
        <header className="flex items-center justify-start gap-2">
          <h2 className="pl-8 text-lg font-medium">Tags</h2>
        </header>

        <div className="relative mt-4 pl-8">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-10 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search tags"
            placeholder="Search tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground mt-8 pl-8 text-sm">
            {search ? "No tags match your search." : "No tags yet."}
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2 pl-8">
            {filtered.map((tag) => (
              <Link
                key={tag.id}
                to="/tag/$tagId"
                params={{ tagId: tag.id }}
                className="text-muted-foreground bg-muted hover:bg-muted/80 rounded-md px-3 py-1.5 text-sm transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
