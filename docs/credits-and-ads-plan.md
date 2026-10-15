# Credits & ads — plan (later)

Status: idea, not started. Noted 2026-10-14.

## The idea

- **Payment only removes ads.** Paying (Paystack) buys an ad-free experience, not credits.
- **Credits come from watching ads.** A rewarded ad (a short video watched to the end) adds credits, and credits pay for uses and exports.
- Free users see ads. Users who have paid don't.

## How it would fit what exists

| Today | Change |
|---|---|
| `/api/usage` + `UsageContext`: free trial uses + paid credits | Credits are earned by watching ads instead of bought. |
| `StudioExportGate`: exports cost one *paid* credit | Out of credits: "Watch an ad for 1 credit". |
| `PaywallModal` | Becomes "Watch an ad for credits" plus a "Go ad-free" upgrade. |
| Paystack verify/webhook | Payment sets an `adFree` flag instead of adding credits. |

## Open questions

- **Users who paid to go ad-free can't watch ads, so where do their credits come from?** Options: unlimited use while ad-free, or a monthly credit allowance included with the payment.
- One-off payment or subscription for ad-free?
- Ad network (leaning: Google, see below).
- Exchange rate: credits per ad watched, and a daily cap.
- Verify ad completion **on the server** (the network's server-side callback), not in the browser, or credits get forged.
- Privacy page + cookie consent: ad networks track users. That conflicts with "nothing leaves your device", so keep ads off the editors' canvas and tell users plainly.

## Ad network (recommendation)

| Where | Network | Why |
|---|---|---|
| Website, rewarded ("watch for credits") | **Google Ad Manager** rewarded web ads (GPT `OutOfPageFormat.REWARDED`) | Best fill and rates for a Nigerian/global audience. Free to use. Apply through an AdSense account. |
| Website, normal banners | **AdSense** | Simplest to start, and the same Google account. |
| iOS / Android apps | **AdMob** rewarded ads | Has server-side verification (SSV): Google calls our API when an ad is finished, so credits can't be faked. |
| Fallback if Google rejects or fill is low | AppLixir (web rewarded video) | Built for "watch to earn" on websites, with a server callback. |

Catch: Google's **web** rewarded ads only report completion in the browser (`rewardedSlotGranted`), with no server callback. So for the website, cap ad credits per day per user/IP and accept some abuse, or use AppLixir for its callback. The apps (AdMob SSV) are safe.

Approval: needs a live site with real content plus a privacy policy and cookie consent (Google's CMP is fine).

Step-by-step setup guide (Google): docs/google-ads-setup-guide.pdf
