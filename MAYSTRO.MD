# Maystro API Documentation



- a product has to be created on maystro side before creating an order of that product. so when the user create a product on our platform we have to create it on maystro side too using his api token and store id.

## Base Requirements

### Integration Settings
- `api_token`
- `store_id`

### Authorization
Most authenticated requests require:
- Header: `Authorization: <api_token>`

For JSON requests:
- Header: `Content-Type: application/json`

---

## Products API

### Create Product
**POST** `https://orders-management.maystro-delivery.com/api/stock/products/`

#### Headers
- `Authorization`

#### Required Body Parameters
- `store_id` — string
- `logistical_description` — string
- `product_id` — string

#### Response Example Fields
- `id`
- `delivery_rate`
- `cancelation_rate`
- `display_id`
- `created_at`
- `updated_at`
- `deleted_at`
- `picture`
- `product_id`
- `logistical_description`
- `comercial_description`
- `deleted`
- `low_stock_level`
- `store`

### Update Product
**PATCH** `https://orders-management.maystro-delivery.com/api/stock/products/{Product_id}`

#### Headers
- `Authorization`

#### Notes
- Update product with id `<Product_id>`
- `{Product_id}` may be the Maystro UUID or the id added by the store

### Delete Product
**DELETE** `https://orders-management.maystro-delivery.com/api/stock/products/{Product_id}`

#### Headers
- `Authorization`

#### Notes
- Delete product with id `<Product_id>`
- `{Product_id}` may be the Maystro UUID or the id added by the store
- Delete and update are allowed only if there are no stock-related constraints



### Get All Products
**GET** `https://orders-management.maystro-delivery.com/api/stock/products/`

---

## Orders API

### Create Order
**POST** `https://orders-management.maystro-delivery.com/api/orders`

#### Required Headers
- `Content-Type: application/json`
- `Authorization: <token>`

#### API Notes
- Supports single and bulk order creation
- Maximum 100 orders per request payload
- Products can be created during order creation using the `description` field in `details`
- Improved error mappings are provided by the API

#### Body Parameters
- `customer_name` — string — required
- `customer_phone` — string — required
- `customer_phone2` — string — optional
- `destination_text` — string — required
- `note_to_driver` — string — optional
- `express` — boolean — optional
- `external_id` — string — optional
- `total_price` — integer — required
- `delivery_type` — integer — required
- `pickup_point` — ID — required only for pickup-point delivery
- `commune` — string — required
- `wilaya` — string — required
- `details` — list of objects — required

#### `details[]` Fields
- `product` — string
- `description` — string
- `quantity` — integer — required

#### Delivery Types
- `1` — home delivery
- `2` — stop desk
- `3` — pickup point

#### Example Response Fields
- `id`
- `external_id`
- `tracking`
- `success`
- `delivery_price`

### Order Error Mappings
- `10` — Order price is not valid or was not defined
- `20` — Order address is not defined
- `30` — Order customer information (`customer_name` / `customer_phone`) is not valid or was not defined
- `40` — Order wilaya or commune do not exist or they were not defined
- `45` — Order delivery type does not exist for the provided commune
- `50` — No products in `details` were specified or they are not consistent or not valid
- `55` — Duplicated order (same `customer_name` / `customer_phone` or same `customer_name` / `customer_phone` / `customer_phone2` already exists in the last 24 hours)
- `60` — Unexpected error
- `70` — Order delivery pricing or fees could not be detected
- `80` — Orders list is empty (payload contains no orders)
- `90` — Orders amount/number exceeded (more than 100 orders)
- `100` — Order's `external_id` exceeded length limits (110 characters)
- `101` — Company delivery price with points has not enough points

---

## Order Status API Reference

### Status Codes
- `4` — `CREATED`
- `5` — `PICK_UP_REQUESTED`
- `6` — `IN_PROCESS`
- `8` — `WAITING_TRANSIT`
- `9` — `IN_TRANSIT_TO_BE_SHIPPED`
- `10` — `IN_TRANSIT_TO_BE_RETURNED`
- `11` — `PENDING`
- `12` — `OUT_OF_STOCK`
- `15` — `READY_TO_SHIP`
- `22` — `ASSIGNED`
- `31` — `SHIPPED`
- `32` — `ALERTED`
- `41` — `DELIVERED`
- `42` — `POSTPONED`
- `50` — `ABORTED`
- `51` — `READY_TO_RETURN`
- `52` — `TAKEN_BY_STORE`
- `53` — `NOT_RECEIVED`

---

## Wilayas and Communes API

### Get All Wilayas
**GET** `https://orders-management.maystro-delivery.com/api/base/wilayas/`

#### Query Parameters
- `language` — string — wilaya language: `ar` for Arabic, `en` or `fr` for Latin
- `country` — integer — country code, `1` for Algeria

#### Headers
- `Authorization` — store or user token

#### Response
Returns a list of wilaya id/name pairs.

### Get Communes
**GET** `https://orders-management.maystro-delivery.com/api/base/communes/`

#### Query Parameters
- `wilaya` — integer — wilaya id

#### Headers
- `Authorization` — store or user token

#### Response Fields
- `id`
- `wilaya`
- `name`
- `postcode`
- `zone`

---

## Pickup Points API

### Get Pickup Points
**GET** `https://orders-management.maystro-delivery.com/api/base/pickup-points`

#### Query Parameters
- `commune` — commune id used to filter stop desks and pickup points

#### Description
Retrieves the stop desks and pickup points available for a specified commune.

#### Example Response Fields
- `name_lt`
- `name_ar`
- `commune`
- `pickup_point`
- `delivery_type`
- `active`

#### Response Details
- `name_lt` — name in Latin characters
- `name_ar` — name in Arabic characters
- `commune` — commune id
- `pickup_point` — id of the pickup point, or `null` if it is a stop desk
- `delivery_type` — type of delivery service
- `active` — availability status

#### Delivery Type Usage
- `2` — stop desk
- `3` — pickup point

### Example Order Fields for Stop Desk / Pickup Point
Common order payload fields shown in the documentation:
- `external_id`
- `destination_text`
- `total_price`
- `customer_name`
- `customer_phone`
- `express`
- `commune`
- `note_to_driver`
- `details`
- `delivery_type`
- `pickup_point` when needed

---

## Delivery Prices API

### Get Delivery Options by Commune
**GET** `https://orders-management.maystro-delivery.com/api/base/delivery-options/`

#### Query Parameters
- `commune` — integer — commune id retrieved from the commune endpoint

#### Response Codes
- `200` — OK Success
- `404` — Not Found, pricing not found

#### Example Response Fields
Each option may include:
- `type`
- `name`
- `price`
- `min_total_price`
- `required_points`
- `current_points`
- `pickup_point_id`

### Get Delivery Prices by Commune
**GET** `https://orders-management.maystro-delivery.com/api/base/delivery-prices/`

#### Query Parameters
- `commune` — integer — commune id
- `delivery_type` — integer — delivery type

#### Delivery Type Values
- `1` — home delivery
- `2` — stop desk
- `3` — pickup point

#### Response Codes
- `200` — OK Success
- `404` — Not Found, pricing not found

#### Example Response Fields
- `delivery_price`
- `min_total_price`
- `required_points`
- `current_points`

---

## Bordereau / Order Slip API

### Get Order Slip by `display_id_order`
**POST** `https://orders-management.maystro-delivery.com/api/starter_bordureau/`

#### Headers
- `Authorization` — user or store token

#### Request Body
One of the following must be set:
- `all_created` — boolean — if true, generate slips for all orders with status `CREATED`
- `orders_ids` — array — array of `display_id_order` values to include in the slip generation

#### Response
- `200` — returns a PDF file

---

## Webhooks API

### Configure Webhooks for Your Store
Maystro provides two webhook configuration methods:
1. Through the web app interface
2. Through API endpoints

### Get Webhook Types (Events)
**GET** `https://orders-management.maystro-delivery.com/api/stores/hooks/types/`

#### Headers
- `Authorization` — access token of the store

#### Response
Returns available webhook trigger types.

#### Example Event Types Shown
- `test`
- `all`
- `InventoryMovement`

### Get Configured Webhooks
**GET** `https://orders-management.maystro-delivery.com/api/stores/hooks/costume/`

#### Headers
- `Authorization` — access token of the store

#### Response
Returns the list of configured webhooks.

### Create a Webhook
**POST** `https://orders-management.maystro-delivery.com/api/stores/hooks/costume/`

#### Headers
- `Authorization` — access token of the store

#### Example Request Body
- `endpoint`
- `trigger_type_id`

#### Response
- `201` — Created Success

### Delete a Webhook
**DELETE** `https://orders-management.maystro-delivery.com/api/stores/hooks/costume/{id}/`

#### Path Parameters
- `id` — string — id of the webhook to delete

#### Headers
- `Authorization` — access token of the store

#### Response
- `204` — No Content Success

### Webhook Payload Notes
- The webhook endpoint receives JSON data encoded in base64
- Documentation notes mention decoding the received message twice using base64 to access contents

### Example Events Mentioned
- `orderCreated`
- `OrderStatusChanged`
- `InventoryMovement`

### Example Event Payload Shapes
#### `orderCreated`
Fields shown include:
- `hook_trigger`
- `event`
- `instance_uuid`
- `payload.id`
- `payload.status`

#### `OrderStatusChanged`
Fields shown include:
- `hook_trigger`
- `event`
- `instance_uuid`
- `payload.id`
- `payload.status`

#### `InventoryMovement`
Fields shown include:
- `hook_trigger`
- `event`
- `instance_uuid`
- `payload.product`
- `payload.production_quantity`

