---
title: "Your Idea, Their Code: What Must Stay in Your Name"
author: Davide Mendolia
description: A practical checklist for founders working with dev shops and product studios in 2026. Own the code, own the infrastructure, own the keys.
publishDate: 2026-06-02
tags:
  - founders
  - startups
  - dev-shops
  - infrastructure
  - vendor-management
  - ip-ownership
  - cloud
featured: false
draft: true
---

_A practical checklist for founders working with dev shops and product studios in 2026_

---

## The IP conversation is (mostly) settled

By 2026, any reputable dev shop will sign a work-for-hire agreement that assigns code ownership to you. If they won't, walk away. That part is table stakes now.

But code ownership is the floor, not the ceiling. The real trap is subtler: a founder who owns the code but doesn't control the infrastructure is like a landlord who owns the building but handed the keys, the lease, and the utility accounts to the contractor. You can't operate the thing you paid for.

Here is what must be registered, created, and held in your name from day one.

---

## 1. Code and version control

Your code lives somewhere. Make sure that somewhere is yours.

- **GitHub / GitLab / Bitbucket**: Create the org under **your** account or **your** company account. Invite the dev shop as a member. Never let them create the repo under their org and add you later. Migrating repos is annoying. Losing access at a contentious moment is catastrophic.
- **Git history**: The full commit history is part of the asset. It documents what was built, when, and by whom. Insist on it being preserved on transfer.

---

## 2. Domain and DNS

The domain is your address on the internet. Own it directly.

- Register it yourself at Namecheap, Cloudflare Registrar, or Porkbun. Never let the agency register it on your behalf.
- The DNS records (pointing to servers, email, CDN) should be managed under your account. The studio can have access as a collaborator, not as the account holder.
- Subdomains (`api.`, `app.`, `staging.`) follow from owning the root. If you don't own the root, you own nothing.

---

## 3. Cloud infrastructure accounts

Where your product runs is as important as what runs on it.

- **AWS / Google Cloud / Azure**: The root account or billing account must be yours. The dev shop gets an IAM role or sub-project with appropriate permissions. Not the other way around.
- **Vercel / Render**: Your deployment pipeline, your billing, your environment variables.

> **Practical test:** if you fired the studio today, could a new developer be up and running tomorrow without asking the old one for anything? If the answer is yes, you are in good shape. You are not expected to deploy code yourself. You are expected to hold the keys.

---

## A word on "free" infrastructure and hidden switching costs

Some studios will offer to host your product at no cost, or absorb the cloud bill as part of the engagement. It sounds like a good deal. It rarely is.

Cloud infrastructure is not just a server you can pick up and move. Getting a product running in the cloud takes weeks of careful setup. If someone else did that work under their account, you cannot simply take it with you. Even if you own the code and have the theoretical right to leave, actually leaving means rebuilding all of that from scratch: weeks of work, real cost, and a product that may be down or degraded while it happens. The "free hosting" was never free. You just deferred the bill.

The lock-in is operational, not legal. And operational lock-in during a moment of conflict with your studio is a very uncomfortable place to negotiate from.

**One legitimate exception: studio cloud discounts.**

Some larger studios have reseller agreements or committed spend arrangements with AWS, Google Cloud, or Azure. They can pass meaningful discounts to you by routing your billing through their account. This is worth considering, with one condition: the cloud account must still be yours. The discount changes who sends the invoice. It does not change who owns the account, controls the resources, or can revoke access. Get that in writing. If the studio insists the account needs to be in their name for the discount to apply, the discount is not worth it.

---

## 4. App store accounts

App stores have lengthy verification processes and are notoriously slow to transfer ownership. Start right.

- **Apple Developer Program**: Must be enrolled as an organization under your company's legal entity. Individual accounts cannot be cleanly transferred. The D-U-N-S number, the legal entity name, the bank account: all yours.
- **Google Play Console**: Register the developer account under your company Google account. Invite the studio as a user with release manager or developer role.
- **Microsoft Partner Center**: Same principle if you are shipping to Windows or Xbox.

App store transfers after the fact are painful, sometimes impossible within reasonable timelines. Launching under the studio's account because it was faster is a debt you will pay with interest.

---

## Services your product calls at runtime

The following categories all share a common risk: a third-party account your product depends on every time a user does something. Lose access to any of them and part of your product breaks immediately.

## 5. Authentication and identity providers

If your users log in, something manages those identities.

- **Auth0 / Clerk / Firebase Auth**: The tenant or project must be under your account. User data, password hashes (if any), OAuth app credentials: these are your users. You own that relationship.
- **OAuth app registrations** (Google, Facebook, Apple Sign In, GitHub): Registered under your developer accounts, not theirs. If the studio's Google account is the owner of your "Sign in with Google" app, they have a kill switch on your login flow.

---

## 6. Email and transactional messaging

Your product emails to your users. Own that pipeline.

- **SendGrid / Postmark / Resend / AWS SES**: Your account, your API keys, your sending domain.
- **Domain email** (hello@yourproduct.com): Set up under your domain, forwarding to or from whatever inbox you prefer.

Sender reputation is built over time. If it is built on the agency's SendGrid account and they close it, your deliverability starts from zero.

---

## 7. Analytics, monitoring, and error tracking

You need visibility into how your product behaves in production.

- **Mixpanel / Amplitude / PostHog**: Your account, your project.
- **Datadog / Sentry / New Relic / Grafana Cloud**: Your account, your organization.

These tools accumulate months of historical data. Losing access means losing context for debugging, product decisions, and investor due diligence.

---

## 8. Third-party API keys and integrations

Every external API your product calls has an account behind it.

- **Stripe**: Your account, your bank account, your KYC. This one is non-negotiable and non-transferable in any reasonable timeline.
- **Twilio, OpenAI, Google Maps, Mapbox, any AI/ML provider**: Register directly. Treat the API key as a credential to a financial or operational dependency.

Make a list of every third-party API in the product and verify you have independent access to each one.

---

## A rule that applies to all of the above: own your secrets

For every service on this list, you should have direct access to every credential: API keys, passwords, certificates. You should be able to rotate or replace them at any point. Not "ask the studio to send them over." Direct access, in your account, today.

This matters most when you change providers. If your secrets are locked inside a studio-managed tool, switching from one email provider to another, or one auth service to another, becomes a coordination exercise with your old agency instead of an afternoon of work. Own the credentials, and you own the ability to move without asking permission.

---

## A simple rule of thumb

You won't know every service upfront. The stack gets decided as the build progresses. So apply this as a standing rule throughout the engagement: each time a new service is introduced, ask "If this relationship ended badly tomorrow, would I be locked out of this?" If the answer is yes, make sure the account is in your name before it gets configured.

The best studios will actively help you set this up correctly. They have nothing to hide and everything to gain from a clean handover. The ones that resist should raise a flag.

Your product is the asset. The accounts are the wrapper. Own both.
