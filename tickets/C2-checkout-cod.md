# C2 — Checkout COD (No account)

## Goal
Public checkout creates orders for tenant.

## Requirements
- POST /api/checkout
- Required: phone number
- Payment method: COD
- Creates order + order_items
- Status = new

## Tests
- Checkout under tenant A creates order for tenant A
- Missing phone => validation error
