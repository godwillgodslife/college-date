-- Move wallet crediting behind server-verified Paystack flows.

create or replace function public.increment_wallet_balance_admin(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
    if p_amount is null or p_amount <= 0 then
        raise exception 'Invalid amount';
    end if;

    insert into public.wallets (user_id, available_balance, total_earned)
    values (p_user_id, p_amount, p_amount)
    on conflict (user_id) do update
        set available_balance = public.wallets.available_balance + p_amount,
            total_earned = public.wallets.total_earned + p_amount,
            updated_at = now();
end;
$$;

revoke execute on function public.increment_wallet_balance(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.increment_wallet_balance_admin(uuid, numeric) from public, anon, authenticated;
