import { TagSummary } from "~/features/items/types";

export type Event = {
  id: string;
  title: string;
  content: string | null;
  date: string | null;
  sortOrder: string;
  userId: string;
  dateCreated: string;
  dateUpdated: string;
  tags: TagSummary[];
};

export type CreateEventInput = {
  title: string;
  content?: string;
  /** Date in YYYY-MM-DD format. */
  date?: string;
  tagIds?: string[];
};

export type UpdateEventInput = {
  id: string;
  title?: string;
  /**
   * Event date in YYYY-MM-DD format when provided.
   * Use `null` to clear the date.
   */
  content?: string | null;
  date?: string | null;
  tagIds?: string[];
};
