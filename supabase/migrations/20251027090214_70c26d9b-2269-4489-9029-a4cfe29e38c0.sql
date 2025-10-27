-- Add 'cancelled' value to email_status enum if not exists
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'email_status' and e.enumlabel = 'cancelled'
  ) then
    alter type public.email_status add value 'cancelled';
  end if;
end$$;