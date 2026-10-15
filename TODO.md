# TODO

- [ ] Build our own open-source project that others can use too (later).
  - Reference: ArtCraft "Crafting Apps" (https://getartcraft.com/apps), Apache-2.0, https://github.com/storytold
  - Local clones: ~/Developer/craft-apps (photocraft, pdfcraft, filmcraft, vectorcraft, etc.)
  - Idea: pull the conversion/editing logic (Rust -> WebAssembly) into FileFlowHQ so it stays client-side/serverless.
  - Keep Apache-2.0 LICENSE + NOTICE attribution when reusing their code.
- [ ] Rebrand + lock the other 12 Studio editors (same patch pattern as studio/patches/pdfcraft.patch).
- [ ] Turn on the credit paywall for the converter tools (requestUse in UsageContext; see paywall-wip).
- [ ] Credits & ads: payment only removes ads; credits are earned by watching rewarded ads (see docs/credits-and-ads-plan.md).
- [ ] Set PAYSTACK_SECRET_KEY + webhook in Vercel; test with `vercel dev` and a Paystack test key.
