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

## Rollback

The pre-F07 v20.11 baseline is commit `dcb609729bf2ea29e4ae25785de8666cf824d090`, saved at `rollback/v20.11-before-f07`. Revert the v20.12 correction commit to restore it through the normal tested deployment workflow. This restores the known F07 frequency-clearing limitation as well.

The pre-F02 LIVE version is preserved at commit `02b5a1dd02a166261590ad679a92723994911d09` and branch `rollback/v20.10-before-f02`. Revert the v20.11 correction commit in the LIVE repository, run the existing checks and let its normal workflow redeploy. This restores the previous decoder and version indicators without rewriting shared history. If later changes depend on the correction, review the revert first. A rollback returns the known F02 decoding limitation too.

For UAT, revert the specific development commit in the UAT repository. Its previous deployment remains available if a new build fails. Never roll back LIVE by pointing it at UAT source, and never force-push a shared branch as a routine rollback.
