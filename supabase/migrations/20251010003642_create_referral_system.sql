-- Adiciona a coluna para o código de indicação na tabela de perfis
alter table public.profiles
add column referral_code text;

-- Garante que cada código de indicação seja único
create unique index profiles_referral_code_key on public.profiles using btree (referral_code);

-- Popula a coluna com códigos únicos para usuários que ainda não os possuem
update public.profiles
set referral_code = left(replace(gen_random_uuid()::text, '-', ''), 8)
where referral_code is null;

-- Cria a tabela para rastrear as indicações
create table public.referrals (
    id uuid not null default gen_random_uuid(),
    referrer_id uuid not null,
    referred_id uuid not null,
    status text not null default 'pending'::text,
    created_at timestamp with time zone not null default now(),
    constraint referrals_pkey primary key (id),
    constraint referrals_referred_id_key unique (referred_id),
    constraint referrals_referred_id_fkey foreign key (referred_id) references auth.users(id) on delete cascade,
    constraint referrals_referrer_id_fkey foreign key (referrer_id) references auth.users(id) on delete cascade
);

-- Adiciona comentários para clareza
comment on table public.referrals is 'Rastreia o relacionamento de indicações entre usuários.';

-- Habilita a segurança a nível de linha
alter table public.referrals enable row level security;

-- Adiciona políticas de segurança para a tabela de indicações
create policy "Usuários podem ver suas próprias indicações (como quem indicou)"
on public.referrals for select
using (auth.uid() = referrer_id);

create policy "Usuários podem ver se foram indicados por alguém"
on public.referrals for select
using (auth.uid() = referred_id);

create policy "Nenhuma inserção direta"
on public.referrals for insert
with check (false);

create policy "Nenhuma atualização direta"
on public.referrals for update
using (false);

create policy "Nenhuma deleção direta"
on public.referrals for delete
using (false);

-- Adiciona índices para performance
create index ix_referrals_referrer_id on public.referrals (referrer_id);
create index ix_referrals_referred_id on public.referrals (referred_id);
