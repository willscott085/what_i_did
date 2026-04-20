import { Tag } from "~/features/tags/types";

export type Note = {
  id: string;
  content: string;
  title: string | null;
  date: string | null;
  sortOrder: string;
  userId: string;
  dateCreated: string;
  dateUpdated: string;
  tags: { id: string; name: string }[];
};

export type NoteWithTags = Note & {
  tags: Tag[];
  metadata: {
    keywords: string | null;
  } | null;
};

export type CreateNoteInput = {
  content: string;
  title?: string;
  date?: string;
  tagIds?: string[];
};

export type UpdateNoteInput = {
  id: string;
  content?: string;
  title?: string | null;
  date?: string | null;
  tagIds?: string[];
  sortOrder?: string;
};

export type PaginatedNotes = {
  notes: Note[];
  total: number;
  page: number;
  totalPages: number;
};
