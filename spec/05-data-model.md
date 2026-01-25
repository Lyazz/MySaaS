# Data Model (Minimum)

## Tenants (global)
- id (uuid)
- slug (string, unique)
- name
- status (active/suspended/deleted)
- primary_domain (nullable)
- created_at, updated_at

## Users (global or tenant-scoped)
MVP: tenant-scoped users (simpler).
- id
- tenant_id
- email
- password_hash (or auth provider id)
- role (owner/admin/staff)
- created_at, updated_at

## Products
- id
- tenant_id
- title
- slug (unique per tenant)
- description
- price
- stock (optional if variants manage stock)
- is_active
- created_at, updated_at

## Variants
- id
- tenant_id
- product_id
- sku (optional)
- option_name (e.g. Color)
- option_value (e.g. Red)
- price_delta (optional)
- stock
- created_at, updated_at

## Categories
- id
- tenant_id
- title
- slug (unique per tenant)

## Orders
- id
- tenant_id
- status (new/confirmed/shipped/delivered/cancelled)
- payment_method (COD, later CHARGILY)
- customer_name
- customer_phone
- wilaya
- address (optional)
- total_amount
- created_at, updated_at

## Order Items
- id
- tenant_id
- order_id
- product_id
- variant_id (nullable)
- quantity
- unit_price

## Pages (static)
- id
- tenant_id
- type (about/contact/home_section)
- content (json or markdown)
- locale
