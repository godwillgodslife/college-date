-- Migration: 20260903130000_avatar_and_notification_sync.sql
-- Authoritative profile avatar synchronization & notification trigger alignment

create or replace function public.update_photo_timestamp()
returns trigger
language plpgsql
volatile
security invoker
set search_path to ''
as $$
begin
    -- 1. If profile_photos[1] is set and distinct from old profile_photos[1], sync avatar_url
    if new.profile_photos is not null and array_length(new.profile_photos, 1) > 0 then
        if old.profile_photos is null 
           or array_length(old.profile_photos, 1) = 0 
           or new.profile_photos[1] is distinct from old.profile_photos[1] then
            if new.profile_photos[1] is not null and btrim(new.profile_photos[1]) <> '' then
                new.avatar_url := new.profile_photos[1];
            end if;
        end if;
    end if;

    -- 2. If avatar_url was empty or null, fallback to profile_photos[1]
    if coalesce(new.avatar_url, '') = '' and new.profile_photos is not null and array_length(new.profile_photos, 1) > 0 then
        new.avatar_url := new.profile_photos[1];
    end if;

    -- 3. Update photo_updated_at if any photo field changed
    if new.avatar_url is distinct from old.avatar_url
       or new.photos is distinct from old.photos
       or new.profile_photos is distinct from old.profile_photos then
        new.photo_updated_at := now();
    end if;

    return new;
end;
$$;

-- 4. Notification trigger alignment:
-- Ensure handle_new_message_notification populates both recipient_id and user_id
create or replace function public.handle_new_message_notification()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
    insert into public.notifications (
        user_id,
        recipient_id,
        actor_id,
        sender_id,
        type,
        category,
        title,
        content,
        metadata,
        conversation_id,
        match_id
    )
    values (
        NEW.recipient_id,
        NEW.recipient_id,
        NEW.sender_id,
        NEW.sender_id,
        'message',
        'chat',
        'New Message',
        substring(NEW.content from 1 for 50),
        jsonb_build_object('message_id', NEW.id, 'match_id', NEW.match_id),
        NEW.match_id,
        NEW.match_id
    );
    return NEW;
end;
$$;
