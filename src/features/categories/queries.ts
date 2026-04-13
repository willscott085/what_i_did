import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_USER_ID, categoriesQueryKeys } from "./consts";
import { fetchCategories } from "./server";

export const fetchCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: [...categoriesQueryKeys.all],
    queryFn: () => fetchCategories({ data: { userId: DEFAULT_USER_ID } }),
  });
