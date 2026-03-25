# Employee & Freelancer Contract Management Panel for Restaurant Staff

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/99

## Problem / goal

There is no structured way in the staff area to create, store, and manage **employee** and **freelancer** contracts. Management needs templates, status tracking, secure document storage, and basic **tax / legal** metadata; staff need read access to their own contracts and key terms. The issue asks for industry-appropriate fields, RBAC, encryption/GDPR-minded handling, and flexibility for **localization** and different legal frameworks.

## High-level instructions for coder

- Review **`docs/`**, **`README.md`**, and existing **staff / HR / user** patterns (roles, tenant scoping, file uploads) before designing new models and routes.
- Design a **contract management** module: templates (employee vs freelancer), CRUD, statuses (e.g. active, expired, pending signature), versioning, and signed document upload; align with existing auth and tenant isolation.
- Implement **role-based access**: full management in staff/admin UI; limited self-service for the subject user (view/download, key fields only).
- Add structured fields for **tax/legal** differentiation (employee payroll vs freelancer invoicing) without over-promising jurisdiction-specific compliance; keep data model extensible for future locales.
- Plan **secure storage** for files and metadata (encryption at rest or equivalent patterns used elsewhere in the repo); avoid logging sensitive payloads.
- Deliver a **functional UI** in the restaurant staff section that satisfies the acceptance criteria in the issue; add migrations and tests consistent with project conventions.
