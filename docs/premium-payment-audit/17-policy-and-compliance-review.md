# Policy and Compliance Review

This is not legal advice. It is a technical policy-risk review.

## Positive Evidence

- Android Premium uses RevenueCat/Google Play rather than Paystack.
- Native RevenueCat app user ID is tied to the College Date Supabase user ID.
- The public site includes terms/privacy/support pages in the broader repo.
- The Premium page discloses monthly billing and "Cancel anytime" language.

## Policy Risks

- Android wallet funding uses Paystack and wallet funds can buy digital features. This may conflict with Google Play Payments policy for digital content/services.
- Web Paystack Premium appears as a 30-day activation, while UI wording implies monthly billing/cancellation. If not recurring, wording should be clarified.
- Cancellation instructions are not visible in the audited Premium/Settings flow.
- Refund terms and subscription management links were not found in-app.
- Google Play subscription price/disclosure is unverified from actual Play Billing UI.

## Requires Business/Legal Approval

- Whether Android users may fund an in-app wallet externally when the wallet buys swipes, boosts, gifts, or Premium.
- Whether web Premium is a recurring subscription or a one-time 30-day purchase.
- Refund policy wording and support SLA.
- Promotional claims such as "2,500+ students upgraded this week" and "+3x Matches" need evidence or removal.
