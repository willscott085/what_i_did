export interface List {
  id: string;
  title: string | null;
  userId: string;
}

export interface ListItem {
  id: string;
  listId: string;
  taskId: string;
  sortOrder: number;
}
