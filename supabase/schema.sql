-- Schema MVP sem login (uso interno)
create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_number text not null unique,
  proposal_date date not null,
  proposal_city text,
  validity_days integer,
  status text not null default 'open' check (status in ('open','converted','lost')),
  attention_to text,
  collection_time text,
  report_time text,
  payment_terms text,
  sales_person text,
  general_notes text,
  subtotal numeric(14,2) not null default 0,
  client_id uuid not null references public.clients(id) on delete restrict,

  tax_percent numeric(8,4) not null default 0,
  commission_percent numeric(8,4) not null default 0,
  gross_revenue numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_internal_costs numeric(14,2) not null default 0,
  net_profit numeric(14,2) not null default 0,
  profit_margin_percent numeric(8,4) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  service text not null,
  service_label text,
  description text,
  unit text,
  quantity numeric(12,3) not null default 0,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  position integer not null default 1,

  supplier_cost_unit numeric(14,2) not null default 0,
  supplier_cost_total numeric(14,2) not null default 0,
  logistics_cost numeric(14,2) not null default 0,
  sample_shipping_cost numeric(14,2) not null default 0,
  item_total_cost numeric(14,2) not null default 0,
  item_profit numeric(14,2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proposals_date on public.proposals(proposal_date);
create index if not exists idx_proposals_status on public.proposals(status);
create index if not exists idx_proposals_date_status on public.proposals(proposal_date, status);
create index if not exists idx_proposal_items_prop_pos on public.proposal_items(proposal_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists trg_proposals_updated_at on public.proposals;
create trigger trg_proposals_updated_at
before update on public.proposals
for each row execute function public.set_updated_at();

drop trigger if exists trg_proposal_items_updated_at on public.proposal_items;
create trigger trg_proposal_items_updated_at
before update on public.proposal_items
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;

drop policy if exists clients_all_anon on public.clients;
create policy clients_all_anon on public.clients
for all to anon
using (true)
with check (true);

drop policy if exists proposals_all_anon on public.proposals;
create policy proposals_all_anon on public.proposals
for all to anon
using (true)
with check (true);

drop policy if exists proposal_items_all_anon on public.proposal_items;
create policy proposal_items_all_anon on public.proposal_items
for all to anon
using (true)
with check (true);
