import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { fetchCategoriesQueryOptions } from "~/features/categories/queries";

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const { data: categories = [] } = useQuery(fetchCategoriesQueryOptions());

  const selectedCategory = value
    ? categories.find((c) => c.id === value)
    : null;

  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
      <SelectTrigger className="w-full">
        {selectedCategory ? (
          <span className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: selectedCategory.color }}
            />
            {selectedCategory.name}
          </span>
        ) : (
          <SelectValue placeholder="Select priority…" />
        )}
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex flex-col text-left">
                <span>{cat.name}</span>
                {cat.description && (
                  <span className="text-muted-foreground text-xs font-normal">
                    {cat.description}
                  </span>
                )}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
