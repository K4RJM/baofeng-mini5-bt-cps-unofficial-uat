# v20.35 browser result received November 1, 2026

K4RJM supplied a browser result showing **all 29 listed checks passed**, with the application badge **20.35-UAT.14530dc**. Credit those 29 results as supplied; do not record this as a complete v20.35 browser pass.

The deployed v20.35 runner contains **30** checks. The supplied list omits **UAT diagnostics retain connection failures and silent handshakes with explicit BLE send selection**. It otherwise contains the earlier 29 checks, including the UAT selector and both mutation checks.

The runner fetches the application afresh for each test. An already-open or cached older runner can therefore display a newer application badge. This explains a possible mixed result; the exact cache state was not captured. v20.36 adds a separate runner version, a matching-version check and a required completion count. The new page still needs to be loaded to get those protections.

No physical radio was involved in these browser checks. Physical handshake reports are recorded separately in [UAT-RADIO-PROTOCOLS.md](UAT-RADIO-PROTOCOLS.md).
