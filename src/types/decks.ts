export interface DeckRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  modified_at: string;
}

export interface CardRow {
  id: string;
  title: string;
  number: number;
  image: string;
  censor_image: string | null;
  deck_id: string;
}
