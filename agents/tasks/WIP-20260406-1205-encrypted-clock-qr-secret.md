# Encrypted clock QR secret + persistent download in Settings

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/167

## Problem / goal
Implement an encrypted clock QR secret and allow persistent download of this secret in the Settings section.

## High-level instructions for coder
- Investigate how to securely store and manage a QR secret for clocking in.
- Implement functionality to generate and encrypt this secret.
- Add a feature in the Settings UI to allow users to download this secret persistently.
- Ensure security best practices are followed for handling sensitive secrets.
