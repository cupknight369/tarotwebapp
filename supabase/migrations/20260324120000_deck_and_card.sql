-- Deck catalog + card rows (default Rider-Waite-Smith seed)

create table public.deck (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now()
);

create table public.card (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  number int not null,
  image text not null,
  censor_image text,
  deck_id uuid not null references public.deck (id) on delete cascade,
  description text,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  unique (deck_id, number)
);

create index card_deck_id_idx on public.card (deck_id);

create or replace function public.set_deck_card_modified_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modified_at := now();
  return new;
end;
$$;

create trigger deck_set_modified_at
  before update on public.deck
  for each row
  execute function public.set_deck_card_modified_at();

create trigger card_set_modified_at
  before update on public.card
  for each row
  execute function public.set_deck_card_modified_at();

alter table public.deck enable row level security;
alter table public.card enable row level security;

create policy "Anyone can read deck catalog"
  on public.deck
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can read card catalog"
  on public.card
  for select
  to anon, authenticated
  using (true);

grant select on table public.deck to anon, authenticated;
grant select on table public.card to anon, authenticated;

-- Fixed id for bootstrap / localStorage default
insert into public.deck (id, title, description)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Rider-Waite-Smith',
  'Default deck'
);

insert into public.card (title, number, image, censor_image, deck_id)
select
  v.title,
  v.number,
  v.image,
  v.censor_image,
  'a0000000-0000-4000-8000-000000000001'::uuid
from (
  values
  ('The Fool'::text, 0::int, 'm00.webp'::text, null::text),
  ('The Magician'::text, 1::int, 'm01.webp'::text, null::text),
  ('The High Priestess'::text, 2::int, 'm02.webp'::text, null::text),
  ('The Empress'::text, 3::int, 'm03.webp'::text, null::text),
  ('The Emperor'::text, 4::int, 'm04.webp'::text, null::text),
  ('The Hierophant'::text, 5::int, 'm05.webp'::text, null::text),
  ('The Lovers'::text, 6::int, 'm06.webp'::text, 'm06c.webp'::text),
  ('The Chariot'::text, 7::int, 'm07.webp'::text, 'm07c.webp'::text),
  ('The Strength'::text, 8::int, 'm08.webp'::text, null::text),
  ('The Hermit'::text, 9::int, 'm09.webp'::text, null::text),
  ('The Wheel Of Fortune'::text, 10::int, 'm10.webp'::text, 'm10c.webp'::text),
  ('Justice'::text, 11::int, 'm11.webp'::text, null::text),
  ('The Hangman'::text, 12::int, 'm12.webp'::text, null::text),
  ('Death'::text, 13::int, 'm13.webp'::text, null::text),
  ('Temperance'::text, 14::int, 'm14.webp'::text, null::text),
  ('The Devil'::text, 15::int, 'm15.webp'::text, 'm15c.webp'::text),
  ('The Tower'::text, 16::int, 'm16.webp'::text, null::text),
  ('The Star'::text, 17::int, 'm17.webp'::text, 'm17c.webp'::text),
  ('The Moon'::text, 18::int, 'm18.webp'::text, null::text),
  ('The Sun'::text, 19::int, 'm19.webp'::text, 'm19c.webp'::text),
  ('Judgement'::text, 20::int, 'm20.webp'::text, 'm20c.webp'::text),
  ('The World'::text, 21::int, 'm21.webp'::text, 'm21c.webp'::text),
  ('Ace Of Wands'::text, 22::int, 'w01.webp'::text, null::text),
  ('Two Of Wands'::text, 23::int, 'w02.webp'::text, null::text),
  ('Three Of Wands'::text, 24::int, 'w03.webp'::text, null::text),
  ('Four Of Wands'::text, 25::int, 'w04.webp'::text, null::text),
  ('Five Of Wands'::text, 26::int, 'w05.webp'::text, null::text),
  ('Six Of Wands'::text, 27::int, 'w06.webp'::text, null::text),
  ('Seven Of Wands'::text, 28::int, 'w07.webp'::text, null::text),
  ('Eight Of Wands'::text, 29::int, 'w08.webp'::text, null::text),
  ('Nine Of Wands'::text, 30::int, 'w09.webp'::text, null::text),
  ('Ten Of Wands'::text, 31::int, 'w10.webp'::text, null::text),
  ('Page Of Wands'::text, 32::int, 'w11.webp'::text, null::text),
  ('Knight Of Wands'::text, 33::int, 'w12.webp'::text, null::text),
  ('Queen Of Wands'::text, 34::int, 'w13.webp'::text, null::text),
  ('King Of Wands'::text, 35::int, 'w14.webp'::text, null::text),
  ('Ace Of Cups'::text, 36::int, 'c01.webp'::text, null::text),
  ('Two Of Cups'::text, 37::int, 'c02.webp'::text, null::text),
  ('Three Of Cups'::text, 38::int, 'c03.webp'::text, null::text),
  ('Four Of Cups'::text, 39::int, 'c04.webp'::text, null::text),
  ('Five Of Cups'::text, 40::int, 'c05.webp'::text, null::text),
  ('Six Of Cups'::text, 41::int, 'c06.webp'::text, null::text),
  ('Seven Of Cups'::text, 42::int, 'c07.webp'::text, null::text),
  ('Eight Of Cups'::text, 43::int, 'c08.webp'::text, null::text),
  ('Nine Of Cups'::text, 44::int, 'c09.webp'::text, null::text),
  ('Ten Of Cups'::text, 45::int, 'c10.webp'::text, null::text),
  ('Page Of Cups'::text, 46::int, 'c11.webp'::text, null::text),
  ('Knight Of Cups'::text, 47::int, 'c12.webp'::text, null::text),
  ('Queen Of Cups'::text, 48::int, 'c13.webp'::text, null::text),
  ('King Of Cups'::text, 49::int, 'c14.webp'::text, null::text),
  ('Ace Of Swords'::text, 50::int, 's01.webp'::text, null::text),
  ('Two Of Swords'::text, 51::int, 's02.webp'::text, null::text),
  ('Three Of Swords'::text, 52::int, 's03.webp'::text, null::text),
  ('Four Of Swords'::text, 53::int, 's04.webp'::text, null::text),
  ('Five Of Swords'::text, 54::int, 's05.webp'::text, null::text),
  ('Six Of Swords'::text, 55::int, 's06.webp'::text, null::text),
  ('Seven Of Swords'::text, 56::int, 's07.webp'::text, null::text),
  ('Eight Of Swords'::text, 57::int, 's08.webp'::text, null::text),
  ('Nine Of Swords'::text, 58::int, 's09.webp'::text, null::text),
  ('Ten Of Swords'::text, 59::int, 's10.webp'::text, null::text),
  ('Page Of Swords'::text, 60::int, 's11.webp'::text, null::text),
  ('Knight Of Swords'::text, 61::int, 's12.webp'::text, null::text),
  ('Queen Of Swords'::text, 62::int, 's13.webp'::text, null::text),
  ('King Of Swords'::text, 63::int, 's14.webp'::text, null::text),
  ('Ace Of Pentacles'::text, 64::int, 'p01.webp'::text, null::text),
  ('Two Of Pentacles'::text, 65::int, 'p02.webp'::text, null::text),
  ('Three Of Pentacles'::text, 66::int, 'p03.webp'::text, null::text),
  ('Four Of Pentacles'::text, 67::int, 'p04.webp'::text, null::text),
  ('Five Of Pentacles'::text, 68::int, 'p05.webp'::text, null::text),
  ('Six Of Pentacles'::text, 69::int, 'p06.webp'::text, null::text),
  ('Seven Of Pentacles'::text, 70::int, 'p07.webp'::text, null::text),
  ('Eight Of Pentacles'::text, 71::int, 'p08.webp'::text, null::text),
  ('Nine Of Pentacles'::text, 72::int, 'p09.webp'::text, null::text),
  ('Ten Of Pentacles'::text, 73::int, 'p10.webp'::text, null::text),
  ('Page Of Pentacles'::text, 74::int, 'p11.webp'::text, null::text),
  ('Knight Of Pentacles'::text, 75::int, 'p12.webp'::text, null::text),
  ('Queen Of Pentacles'::text, 76::int, 'p13.webp'::text, null::text),
  ('King Of Pentacles'::text, 77::int, 'p14.webp'::text, null::text)
) as v (title, number, image, censor_image);
