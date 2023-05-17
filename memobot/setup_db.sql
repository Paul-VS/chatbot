create extension if not exists vector with schema public;

create table "public"."chat_history" (    
    time_created timestamptz default now(), 
    user_id uuid not null references auth.users on delete cascade,
    content text, 
    token_count int,
    embedding vector(1536)    
);