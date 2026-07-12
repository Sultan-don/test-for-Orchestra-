-- Удаляем если есть, чтобы создать заново (ОСТОРОЖНО: это удалит данные)
-- drop table if exists likes;
-- drop table if exists posts;
-- drop table if exists profiles;

create table if not exists profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  unique(post_id, user_id)
);

-- На всякий случай еще раз выключаем RLS
alter table profiles disable row level security;
alter table posts disable row level security;
alter table likes disable row level security;

-- ДЛЯ ПРОФИЛЕЙ: Добавляем колонки для полной информации (как в Instagram)
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists website text;
alter table profiles add column if not exists avatar_url text;

-- ДЛЯ ПОДПИСОК (Фолловеры)
create table if not exists follows (
  follower_id uuid references auth.users not null,
  following_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

alter table follows disable row level security;

-- ДЛЯ СОХРАНЕННЫХ ПОСТОВ
create table if not exists saved_posts (
  user_id uuid references auth.users not null,
  post_id uuid references posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);
alter table saved_posts disable row level security;

-- ДЛЯ СТОРИС
create table if not exists stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table stories disable row level security;

-- ДЛЯ КОММЕНТАРИЕВ
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table comments disable row level security;
