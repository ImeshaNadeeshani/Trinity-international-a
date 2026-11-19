# Document scanner for local testing

The scanner uses this Windows computer's Microsoft Defender, through an authenticated Node HTTP gateway and a Cloudflare Quick Tunnel. It is a temporary testing setup, not permanent production hosting.

## Start / reconnect after restarting Windows

From the repository directory:

```powershell
node tools/scanner/start.mjs
```

The launcher finds Defender, starts hidden gateway/tunnel processes if needed, and updates the project's Supabase scanner secrets using the existing Supabase CLI login. API keys stay in ignored `tmp/scanner` files. Never copy those files to the browser/public directory or commit them.

Keep this computer awake and online while testing uploads. On restart the tunnel address can change; run the command again to reconnect it. Check failures in `tmp/scanner/gateway.err.log` and `tmp/scanner/tunnel.err.log`.

The provider value in `trinity_configuration.document_scanner_provider` is `microsoft-defender-gateway`. The deployed `scan-student-document` function checks the student's/staff member's permissions, retrieves the private file, checks its contents and hash, sends it to the authenticated scanner, and records a clean result only after a real scan.

The gateway uses a per-request random temporary directory, ignores supplied filenames for filesystem access, verifies SHA-256, limits request/file size, scans one file at a time and deletes temporary files. Scanner failures, timeouts and ambiguous Defender results return unavailable; they never return clean. A confirmed threat is not automatically classified in this development adapter; it remains locked for investigation.

## Verify

1. Upload a test PDF, JPG or PNG using a student account.
2. Open Document Review using an authorized staff account.
3. If still pending, use Check / retry scan.
4. Preview and approve only after the scan reports clean. Scan success does not approve the document's identity/content.

```powershell
node --test tests/scanner-gateway.test.mjs
```

## Production

Move the scanner gateway to an always-on managed host and use a stable authenticated HTTPS endpoint. Do not rely on a laptop or temporary tunnel for live admissions. A production adapter should explicitly distinguish confirmed infections from scanner errors and keep engine signatures current.

References: [Microsoft Defender command-line documentation](https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus), [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
