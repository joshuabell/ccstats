# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-04-15

### Added

- Multi-device support: aggregate usage from multiple machines into one dashboard
- Per-machine snapshot files under `data/machines/`
- Machine registration via `npm run setup`
- Anthropic-inspired design overhaul with dark/light mode
- Activity heatmap (GitHub-style contribution graph)
- Paginated activity timeline
- Dynamic ASCII art header
- Streak tracking (current and longest)
- Biome linting and formatting
- Unit test suite
- GitHub Actions CI/CD pipeline for GitHub Pages

### Changed

- Data storage restructured: per-machine files aggregated into `stats.json` and `days.json`
- Dashboard UI completely redesigned

## [1.0.0] - 2025-03-01

### Added

- Initial release
- Single-machine Claude Code usage dashboard
- Daily, weekly, monthly, and lifetime stats
- GitHub Pages deployment
