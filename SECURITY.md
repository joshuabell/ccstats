# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ccstats, please report it responsibly.

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities through [GitHub's private vulnerability reporting](../../security/advisories/new).

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix**: Depending on severity, typically within 2 weeks for critical issues

## Scope

This policy applies to the ccstats repository. Since ccstats is a static site generator that produces client-side HTML/JS/CSS, the primary security concerns are:

- Cross-site scripting (XSS) in the dashboard
- Data injection through malicious JSON data files
- Supply chain vulnerabilities in dependencies

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | Yes                |
| < 2.0   | No                 |
