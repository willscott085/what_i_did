import { Tag } from "~/features/tags/types";

export type Event = {
  id: string;
  title: string;
  content: string | null;
  date: string | null;
  sortOrder: string;
  userId: string;
  dateCreated: string;
  dateUpdated: string;
  tags: { id: string; name: string }[];
};

export type EventWithTags = Event & {
  tags: Tag[];
};

export type CreateEventInput = {
  title: string;
  content?: string;
  date?: string;
  tagIds?: string[];
};

export type UpdateEventInput = {
  id: string;
  title?: string;
  content?: string | null;
  date?: string | null;
  tagIds?: string[];
};
