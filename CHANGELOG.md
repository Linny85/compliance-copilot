# Changelog

All notable changes to this project will be documented in this file.

## [0.8.3] - 2025-10-29

### Changed
- Refactored AppLayout from Flex to CSS Grid for proper content centering
- Simplified AdminPage to pure centering container without sidebar offsets
- Fixed Sidebar positioning: changed from fixed to sticky within grid layout
- Re-integrated SidebarProvider with grid shell to prevent context errors

### Added
- Layout Regression Guard (useLayoutGuard hook) for development-time layout validation
- Visual dev badge showing "Layout ✅" when proper layout context is detected
- Data attribute markers on SidebarProvider for automated detection

### Fixed
- Resolved right-alignment issue on admin pages (Ops Dashboard, Training Certificates, AI Systems)
- Fixed "useSidebar must be used within SidebarProvider" error
- Removed artificial gap elements and fixed positioning that caused layout shifts

### Infrastructure
- Added comprehensive backup/restore tooling (snapshot.sh)
- Documented release process with DB dumps, env backups, and external service exports
