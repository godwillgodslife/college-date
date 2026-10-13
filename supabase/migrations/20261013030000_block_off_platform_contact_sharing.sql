-- Migration: 20261013030000_block_off_platform_contact_sharing.sql
-- Description: Server-authoritative guard against off-platform contact sharing in chat messages.
-- Standard users cannot share phone numbers, social media handles, or external links.
-- Subscribed Elite Ultra VIP members (15k/mo) have complete exemption to share/ask contacts without safeguards.

CREATE OR REPLACE FUNCTION public.check_message_off_platform_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_ultra boolean := false;
    v_plan text;
    v_clean text;
BEGIN
    -- Only evaluate text messages
    IF NEW.type IS DISTINCT FROM 'text' OR NEW.content IS NULL OR length(trim(NEW.content)) = 0 THEN
        RETURN NEW;
    END IF;

    -- Check if sender has active Elite Ultra VIP status
    SELECT 
        COALESCE(p.is_ultra, false) OR COALESCE(s.plan_type = 'ultra', false) OR COALESCE(s.tier = 'ultra', false)
    INTO v_is_ultra
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
    WHERE p.id = NEW.sender_id;

    -- Elite Ultra members bypass all contact-sharing safeguards
    IF v_is_ultra IS TRUE THEN
        RETURN NEW;
    END IF;

    -- Also check metadata flag if client passed verified session claim
    IF (NEW.metadata->>'isUltraSender')::boolean IS TRUE THEN
        RETURN NEW;
    END IF;

    v_clean := lower(NEW.content);

    -- 1. Block external contact links & domains
    IF v_clean ~* '(wa\.me|chat\.whatsapp\.com|api\.whatsapp\.com|t\.me|telegram\.me|instagram\.com|instagr\.am|snapchat\.com|tiktok\.com|vm\.tiktok\.com|discord\.gg|linktr\.ee|beacons\.ai|bit\.ly|tinyurl\.com)' THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: External messenger links are restricted. Upgrade to Elite Ultra (15k) to share external links.';
    END IF;

    -- 2. Block standard Nigerian phone numbers and international format digits (10-14 digits)
    -- Catches: 0803..., 090..., 070..., 081..., +234..., 0 8 0 3..., 0803-123-4567, etc.
    IF regexp_replace(v_clean, '[^0-9]', '', 'g') ~ '(?:234|0)[789][01][0-9]{7,8}' OR
       length(regexp_replace(v_clean, '[^0-9]', '', 'g')) >= 10 THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: Phone numbers are restricted in chat. Upgrade to Elite Ultra (15k) to exchange contacts freely.';
    END IF;

    -- 3. Block email addresses
    IF v_clean ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: Email addresses cannot be shared. Upgrade to Elite Ultra (15k) to exchange contacts freely.';
    END IF;

    -- 4. Block explicit off-platform phrases & handle exchanges
    IF v_clean ~* '\b(my|your|ur|yr)\s+(whatsapp|whatsap|watsapp|ig|insta|instagram|snap|snapchat|tiktok|telegram|digits|phone number|numba|nomba|line)\b' OR
       v_clean ~* '\b(drop|send|give|share)\s+(your|ur|my)\s+(digits|number|whatsapp|ig|snap|handle|contact)\b' OR
       v_clean ~* '\b(add me on|follow me on|hmu on|whatsapp me|snap me)\s+(whatsapp|snap|snapchat|ig|insta|instagram|tiktok|telegram|x)\b' OR
       v_clean ~* '\b(flash|beep)\s+me\b' OR
       v_clean ~* '\b(drop|send)\s+(your|ur)\s+(opay|palmpay)\b' OR
       v_clean ~* '\b(move|talk|chat)\s+(off|outside)\s+(this|the)\s+app\b' THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: Sharing off-platform contacts is restricted. Upgrade to Elite Ultra (15k) to ask any question without safeguards.';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if present, then bind trigger to public.messages
DROP TRIGGER IF EXISTS trg_check_message_off_platform_contact ON public.messages;

CREATE TRIGGER trg_check_message_off_platform_contact
BEFORE INSERT OR UPDATE OF content ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.check_message_off_platform_contact();
