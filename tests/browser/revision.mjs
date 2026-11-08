// The browser test runner and loaded application must describe the same release.
export const BROWSER_SUITE_VERSION='20.37';
export const BROWSER_CHECK_COUNT=31;
export function browserBuildError(badge){
 const match=String(badge??'').match(/\b(?:Version |build )(\d+\.\d+)(?:-UAT\.[a-z0-9]+)?\b/);
 return match?.[1]===BROWSER_SUITE_VERSION?'':`Browser suite ${BROWSER_SUITE_VERSION} does not match ${badge||'the missing application version'}. Reload the browser-test page before testing.`;
}
