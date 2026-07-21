-- Fix legacy RPC overload for profile completion scoring when profiles.photos is text[].

create or replace function public.calculate_completion_score(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
    p record;
    v_profile jsonb;
    score integer := 0;
begin
    select * into p from public.profiles where id = p_user_id;
    if not found then
      return 0;
    end if;

    v_profile := to_jsonb(p);

    if coalesce(v_profile->>'avatar_url', '') <> '' then score := score + 20; end if;
    if coalesce(v_profile->>'bio', '') <> '' then score := score + 15; end if;
    if coalesce(v_profile->>'university', '') <> '' then score := score + 10; end if;
    if coalesce(v_profile->>'faculty', '') <> '' then score := score + 10; end if;
    if coalesce(v_profile->>'department', '') <> '' then score := score + 10; end if;
    if coalesce(v_profile->>'level', '') <> '' then score := score + 5; end if;
    if coalesce(v_profile->>'genotype', '') <> '' then score := score + 5; end if;
    if coalesce(v_profile->>'mbti', '') <> '' then score := score + 5; end if;
    if coalesce(v_profile->>'attraction_goal', '') <> '' then score := score + 10; end if;

    if jsonb_typeof(v_profile->'photos') = 'array'
       and jsonb_array_length(v_profile->'photos') > 0 then
      score := score + 10;
    end if;

    return least(score, 100);
end;
$$;
