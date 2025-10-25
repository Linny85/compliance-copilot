# Stripe Integration Setup

## Required Secrets

Set these in Lovable Cloud (Settings → Environment Variables):

```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
```

## Stripe Dashboard Configuration

### 1. Create Product & Price
- Go to Products → Add Product
- Set trial period: 14 days (optional - already set in code)
- Copy the Price ID (starts with `price_...`)

### 2. Configure Webhook
- URL: `https://eadjoqlyjxwqjfvukvqx.supabase.co/functions/v1/stripe-webhook`
- Events to send:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end` (optional)

### 3. Get Webhook Secret
- After creating the webhook endpoint, reveal the signing secret
- Copy it to `STRIPE_WEBHOOK_SECRET`

## Testing

### Local Testing with Stripe CLI

```bash
# Forward webhooks to your local environment
stripe listen --forward-to https://eadjoqlyjxwqjfvukvqx.supabase.co/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Flow Test

1. **Start Checkout**: Click "Abonnement starten" on `/billing`
   - Creates customer if needed
   - Pre-inserts subscription record (status: incomplete)
   - Redirects to Stripe Checkout

2. **Complete Payment**: Use test card `4242 4242 4242 4242`
   - Webhook receives `checkout.session.completed`
   - Fetches subscription → status: `trialing`
   - Updates DB with 14-day trial

3. **Check Status**: Return to `/billing`
   - Should show status: "Testzeitraum"
   - Period end: ~14 days from now

4. **Guard Check**: Try accessing `/dashboard`
   - Should allow access (trialing = valid)

### Subscription States

- `incomplete` - Initial state, payment pending
- `trialing` - In 14-day trial period
- `active` - Trial ended, paid subscription
- `past_due` - Payment failed
- `canceled` - User cancelled

### Expected DB Values

After successful checkout:

```sql
SELECT 
  status,           -- 'trialing'
  plan,             -- 'basic'
  current_period_end,  -- NOW() + 14 days
  stripe_customer_id,  -- 'cus_...'
  stripe_sub_id       -- 'sub_...'
FROM v_me_subscription;
```

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct
- Verify webhook secret matches
- Check Supabase function logs

### Status stuck on 'incomplete'
- Check webhook was called
- Verify subscription was created in Stripe
- Check function logs for errors

### Guard blocking access
- Ensure status is 'trialing' or 'active'
- Check view `v_me_subscription` returns data
- Verify `useAuthGuard` includes both statuses

## Production Checklist

- [ ] Switch to live Stripe keys (`sk_live_...`, `price_live_...`)
- [ ] Update webhook endpoint to production URL
- [ ] Test full flow in production
- [ ] Monitor webhook delivery in Stripe Dashboard
- [ ] Set up email notifications for failed payments
- [ ] Configure billing portal settings in Stripe
