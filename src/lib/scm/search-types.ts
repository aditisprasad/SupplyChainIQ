// Client-safe shape shared by the search service and the command palette.
export type SearchHit = {
  id: string;
  group: string;
  label: string;
  detail: string;
  to: string;
};
