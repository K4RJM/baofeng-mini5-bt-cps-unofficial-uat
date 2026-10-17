# LIVE and permanent UAT

| Environment | Site | Source repository |
| --- | --- | --- |
| LIVE | https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial/ | `K4RJM/baofeng-mini5-bt-cps-unofficial` |
| UAT | https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/ | `K4RJM/baofeng-mini5-bt-cps-unofficial-uat` |

Each repository has its own Pages deployment. A push to its main branch runs tests, packages the allowlisted public files, and deploys that repository's site. UAT is continuously available, not an expiring pull-request preview. Its workflow and packaging overlay are restricted to the UAT repository. It uses the repository's own GitHub Actions token; no shared token or cross-repository deployment credential is configured. LIVE's workflow is unchanged.

UAT has a prominent development banner, UAT browser title, UAT build badge, and a diagnostic version with the source commit suffix. `deployment.json` records its environment and full source revision. The overlay is applied only to the packaged UAT artifact. It does not alter the protected radio core. Files and radio data are not copied between browser workspaces.

Initial UAT baseline: LIVE v20.10 (`02b5a1dd02a166261590ad679a92723994911d09`); initial UAT deployment commit `04c6fe71845b0c88daf1375ed43aa0d4aaa6f1e8`. Future development belongs in the UAT repository. v20.11 F02 is a separately authorized LIVE correction, not approval to publish future experiments.

## Promoting one correction

1. Keep an audit correction in a separate commit or narrowly scoped patch, with its tests and evidence. Keep experimental features in separate commits/branches.
2. Start from the current LIVE main branch. Apply only the reviewed application correction and release notes. Do not merge the entire UAT branch or copy its Pages workflow/stamp script.
3. Review the complete diff against LIVE, including protected-core hashes. Run the full suite and the finding-specific regression checks. Explicit TODO failures represent unresolved findings, not completed fixes.
4. Record the deployed LIVE commit and intended rollback before publishing. Promote only after the maintainer authorizes that correction. Deployment succeeds only after the test job succeeds.
5. Verify the published version, relevant offline editing behavior and deployment result. Hardware checks require a separate controlled plan; deploying code does not authorize a radio write.

## F13 browser release gate

For v20.22 and later application changes, run `tests/browser/index.html` on the deployed UAT candidate and require every check to pass before LIVE promotion. This page installs a simulated Bluetooth peripheral before loading the actual application; it cannot operate a physical radio. Keep its visible results with the release record. Node/GitHub CI tests do not substitute for this real-browser gate. After promotion, run the same isolated checks against LIVE and verify its version/changelog. New or changed harness modules must use updated cache URLs. Preserve the separate UAT workflow and never merge unrelated development changes.

## Rollback references

The v20.13 header/changelog/checklist update is separate from the v20.12 radio correction. Revert only its presentation commit to restore the v20.12 interface; the pre-update LIVE source is `1bbdd807e5a132f41ba20a9c55055022c2a8e056`.

The pre-F07 v20.11 baseline is commit `dcb609729bf2ea29e4ae25785de8666cf824d090`, saved at `rollback/v20.11-before-f07`. Revert the v20.12 correction commit to restore it through the normal tested deployment workflow. This restores the known F07 frequency-clearing limitation as well.

The pre-F02 LIVE version is preserved at commit `02b5a1dd02a166261590ad679a92723994911d09` and branch `rollback/v20.10-before-f02`. Revert the v20.11 correction commit in the LIVE repository, run the existing checks and let its normal workflow redeploy. This restores the previous decoder and version indicators without rewriting shared history. If later changes depend on the correction, review the revert first. A rollback returns the known F02 decoding limitation too.

For UAT, revert the specific development commit in the UAT repository. Its previous deployment remains available if a new build fails. Never roll back LIVE by pointing it at UAT source, and never force-push a shared branch as a routine rollback.

## v20.14 channel-validation correction

The exact pre-correction LIVE source is `1b1c6b434c130e3d799bf258ff9bce2d6bef6fe3`. Promote only the reviewed F07 validation release after the isolated UAT checks. Reverting that release restores v20.13 through the existing workflow; it also restores its broad channel-input acceptance. Protocol, encoder/decoder and disconnect/reset changes are not part of this release.

## One-finding release procedure — October 16, 2026

The master task explicitly authorizes incremental LIVE promotion after the full regression suite and exact UAT release have passed verification. Each completed finding, including an accepted limitation, receives its own new version and LIVE tag. Keep [CODEX-PROGRESS.md](CODEX-PROGRESS.md) current. Do not begin the next finding until publication is verified. Post-publication progress-only commits may use [skip ci]; they record evidence and do not republish or reuse an application version. The following release packages that updated record.

Rollback for v20.15: restore/revert to the v20.14 release source at c38d90f8bf047e8ccc84eb3032f05bf0d59c4fef through a new reviewed commit, then test and deploy normally. Do not force-push. The v20.15 closure changes no transport or memory behavior.
