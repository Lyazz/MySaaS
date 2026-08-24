# Yalidine API Documentation

> Markdown version compiled from the official Yalidine API documentation screenshots provided on 2026-05-09.
>
> Base URL used in the examples: `https://api.yalidine.app/v1`

---

## Table of contents

1. [Authentication](#authentication)
2. [Rate limits](#rate-limits)
3. [Pagination](#pagination)
4. [Parcels](#parcels)
5. [Histories](#histories)
6. [Centers](#centers)
7. [Communes](#communes)
8. [Wilayas](#wilayas)
9. [Fees](#fees)
10. [Weight and oversize fee calculation](#weight-and-oversize-fee-calculation)

---

## Authentication

All API requests require authentication using two HTTP headers:

| Header | Description |
|---|---|
| `X-API-ID` | Your Yalidine API ID. |
| `X-API-TOKEN` | Your Yalidine API token. |

Example cURL headers:

```bash
curl --request GET \
  --url "https://api.yalidine.app/v1/wilayas/" \
  --header "X-API-ID: YOUR_API_ID" \
  --header "X-API-TOKEN: YOUR_API_TOKEN"
```

Example PHP setup:

```php
$api_id = "YOUR_API_ID";
$api_token = "YOUR_API_TOKEN";

$curl = curl_init();

curl_setopt_array($curl, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => "",
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => "GET",
    CURLOPT_HTTPHEADER => array(
        "X-API-ID: " . $api_id,
        "X-API-TOKEN: " . $api_token
    ),
));
```

---

## Rate limits

A rate limit is the number of API calls your app can make within a given time period: per second, minute, hour, and day.

Your real-time rate limit usage statistics are displayed in the Yalidine Developer Dashboard.

### Important

The API shows your remaining quota in the HTTP response headers after each call. Watch the returned HTTP headers to know which quota has been completely consumed and to avoid making further requests until that quota resets.

### Quota headers

| Quota | HTTP header variable | Reset time |
|---|---|---|
| Per second | `x-second-quota-left` | Resets 1 second after your first request. |
| Per minute | `x-minute-quota-left` | Resets 60 seconds after your first request. |
| Per hour | `x-hour-quota-left` | Resets 1 hour after your first request. |
| Per day | `x-day-quota-left` | Resets 24 hours after your first request. |

Each timer starts when you make your first request. For example, the per-minute quota resets 60 seconds after your first call.

### Default rate limits

| Type of rate limit | Default quota |
|---|---:|
| Per second | 5 requests |
| Per minute | 50 requests |
| Per hour | 1000 requests |
| Per day | 10000 requests |

When these rate limits are exceeded, the request fails with a `429 Too Many Requests` error. Wait the number of seconds reported by the `Retry-After` header before retrying.

> If you run over your quota many times, your API access may be disabled for a period of time. This period increases each time you go over your quota.

---

## Pagination

The Yalidine API pagination accepts the `page` offset and `page_size` limit query parameters. Both are optional.

### Default values

For most endpoints, `page_size` can be:

- Maximum: `1000` results
- Minimum: `1` result
- Default: `100` results

### Pagination parameters

| Parameter | Type | Description |
|---|---|---|
| `page` | optional | The number of the page you would request. |
| `page_size` | optional | A limit on the number of objects to return, between `1` and `1000`. |

### List response format

| Parameter | Type | Description |
|---|---|---|
| `has_more` | Boolean | Whether there are more elements available after this page. If `false`, this page is the end of the list. |
| `total_data` | int | The count of the total returnable objects for your query. |
| `data` | array | Array containing the actual response elements, paginated by your request or default parameters. |
| `links` | array | URLs for navigating list results. |

### Links object

| Parameter | Type | Description |
|---|---|---|
| `self` | string | URL for accessing the current list of results. |
| `before` | string | URL for accessing the previous list, if it exists. |
| `after` | string | URL for accessing the next list, if it exists. |

Example response:

```json
{
  "has_more": true,
  "total_data": 58,
  "data": [
    {
      "id": 4,
      "name": "Oum El Bouaghi",
      "zone": 2,
      "is_deliverable": 1
    },
    {
      "id": 5,
      "name": "Batna",
      "zone": 2,
      "is_deliverable": 1
    },
    {
      "id": 6,
      "name": "Béjaïa",
      "zone": 2,
      "is_deliverable": 1
    }
  ],
  "links": {
    "self": "https://api.yalidine.app/v1/wilayas/?page_size=3&page=2",
    "before": "https://api.yalidine.app/v1/wilayas/?page_size=3&page=1",
    "next": "https://api.yalidine.app/v1/wilayas/?page_size=3&page=3"
  }
}
```

---

## Parcels

The Parcels endpoint lets you create, retrieve, update, and delete parcels.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/parcels/` | Retrieve parcels. |
| `GET` | `/parcels/{tracking}` | Retrieve a parcel by tracking code. |
| `POST` | `/parcels/` | Create one or many parcels. |
| `PATCH` | `/parcels/{tracking}` | Edit a parcel. |
| `DELETE` | `/parcels/{tracking}` | Delete a parcel by tracking. |
| `DELETE` | `/parcels/?tracking=TRACKING1,TRACKING2` | Delete one or many parcels by query parameter. |

### Retrieve parcels

```http
GET /v1/parcels/
```

Example:

```bash
curl --request GET \
  --url "https://api.yalidine.app/v1/parcels/" \
  --header "X-API-ID: YOUR_API_ID" \
  --header "X-API-TOKEN: YOUR_API_TOKEN"
```

You can access a specific parcel by supplying its `tracking` in the path, or by using the `tracking` parameter to retrieve many parcels in the same request.

```http
GET /v1/parcels/yal-123456
GET /v1/parcels/?tracking=yal-123456,yal-789101
```

### Parcel filters

You can filter parcel requests using one or more query parameters. Multiple values for the same filter can usually be separated by commas, except date filters.

Common filters shown in the official docs include:

| Parameter | Type | Description |
|---|---|---|
| `tracking` | string | Tracking code of the parcel. |
| `order_id` | string | Your internal order ID. |
| `from_wilaya_id` | integer | Sender wilaya ID. |
| `from_wilaya_name` | string | Sender wilaya name. |
| `to_wilaya_id` | integer | Receiver wilaya ID. |
| `to_wilaya_name` | string | Receiver wilaya name. |
| `to_commune_id` | integer | Receiver commune ID. |
| `to_commune_name` | string | Receiver commune name. |
| `firstname` | string | Receiver first name. |
| `familyname` | string | Receiver family name. |
| `contact_phone` | string | Receiver phone number. |
| `address` | string | Receiver address. |
| `product_list` | string | Description of shipment contents. |
| `price` | integer | Amount to recover from the receiver. |
| `do_insurance` | boolean | Whether insurance applies. |
| `declared_value` | integer | Declared shipment value. |
| `length` | integer | Parcel content length in centimeters. |
| `width` | integer | Parcel content width in centimeters. |
| `height` | integer | Parcel content height in centimeters. |
| `weight` | integer | Parcel content weight in kilograms. |
| `freeshipping` | boolean | Whether the delivery fee is paid by the sender. |
| `is_stopdesk` | boolean | Whether delivery is to a stop desk. |
| `stopdesk_id` | string | Stopdesk/center ID, required when `is_stopdesk` is true. |
| `has_exchange` | boolean | Whether the parcel is an exchange request. |
| `product_to_collect` | string | Product to collect when `has_exchange` is true. |
| `status` | string | Current parcel status. |
| `date_creation` | string | Creation date. |
| `date_expedition` | string | Expedition date. |
| `date_livraison` | string | Delivery date. |
| `date_retour` | string | Return date. |
| `page` | integer | Page number. |
| `page_size` | integer | Number of results per page. |
| `fields` | string | Comma-separated list of fields to return. |
| `order_by` | string | Field used for ordering results. |
| `asc` | null | Sort ascending. |
| `desc` | null | Sort descending. |

> For the same filter, you can use many values separated by commas. Date filters are the exception.

### Parcel fields

The response returns a default set of fields. You can specify returned fields with `fields`, separated by commas.

Example:

```http
GET /v1/parcels/?fields=tracking,order_id,status
```

Common parcel fields include:

| Field | Type | Description |
|---|---|---|
| `tracking` | string | Yalidine tracking code. |
| `order_id` | string | Your order ID. |
| `firstname` | string | Receiver first name. |
| `familyname` | string | Receiver family name. |
| `contact_phone` | string | Receiver phone number. |
| `address` | string | Receiver address. |
| `from_wilaya_id` | integer | Sender wilaya ID. |
| `from_wilaya_name` | string | Sender wilaya name. |
| `to_wilaya_id` | integer | Receiver wilaya ID. |
| `to_wilaya_name` | string | Receiver wilaya name. |
| `to_commune_id` | integer | Receiver commune ID. |
| `to_commune_name` | string | Receiver commune name. |
| `product_list` | string | Description of shipment contents. |
| `price` | integer | Amount to recover from receiver. |
| `do_insurance` | boolean | Whether insurance applies. |
| `declared_value` | integer | Declared value. |
| `length` | integer | Length in centimeters. |
| `width` | integer | Width in centimeters. |
| `height` | integer | Height in centimeters. |
| `weight` | integer | Weight in kilograms. |
| `delivery_fee` | integer | Delivery fee. |
| `freeshipping` | boolean | Whether delivery fee is paid by sender. |
| `is_stopdesk` | boolean | Whether parcel is stopdesk delivery. |
| `stopdesk_id` | string | Stopdesk/center ID. |
| `has_exchange` | boolean | Whether parcel is an exchange. |
| `product_to_collect` | string | Product to collect for exchange. |
| `status` | string | Current status. |
| `reason` | string | Status reason, if applicable. |
| `created_at` | string | Creation date/time. |
| `updated_at` | string | Last update date/time. |
| `last_status_at` | string | Last status update date/time. |

### Parcel ordering

By default, parcel results are ordered by `tracking` in ascending order.

```http
GET /v1/parcels/?order_by=tracking
GET /v1/parcels/?order_by=tracking&desc
```

### Create parcels

To create parcels, send an array containing one or many parcel objects.

```http
POST /v1/parcels/
Content-Type: application/json
```

Example request body:

```json
[
  {
    "order_id": "MyFirstOrder",
    "from_wilaya_name": "Alger",
    "firstname": "Mohamed",
    "familyname": "Akil",
    "contact_phone": "0555123456",
    "address": "Cité Kaidi",
    "to_commune_name": "Bordj El Kiffan",
    "to_wilaya_name": "Alger",
    "product_list": "Produit A",
    "price": 3000,
    "do_insurance": true,
    "declared_value": 3500,
    "length": 20,
    "width": 30,
    "height": 10,
    "weight": 6,
    "freeshipping": true,
    "is_stopdesk": false,
    "has_exchange": false
  },
  {
    "order_id": "MySecondOrder",
    "from_wilaya_name": "Alger",
    "firstname": "Yacine",
    "familyname": "Ali",
    "contact_phone": "0666123456",
    "address": "Rue Example",
    "to_commune_name": "Ouled Fayet",
    "to_wilaya_name": "Alger",
    "product_list": "Produit B",
    "price": 1450,
    "do_insurance": false,
    "declared_value": 1500,
    "length": 10,
    "width": 10,
    "height": 10,
    "weight": 3,
    "freeshipping": false,
    "is_stopdesk": false,
    "has_exchange": false
  }
]
```

Example PHP:

```php
$url = "https://api.yalidine.app/v1/parcels/";
$api_id = "YOUR_API_ID";
$api_token = "YOUR_API_TOKEN";

$data = array(
    array(
        "order_id" => "MyFirstOrder",
        "from_wilaya_name" => "Alger",
        "firstname" => "Mohamed",
        "familyname" => "Akil",
        "contact_phone" => "0555123456",
        "address" => "Cité Kaidi",
        "to_commune_name" => "Bordj El Kiffan",
        "to_wilaya_name" => "Alger",
        "product_list" => "Produit A",
        "price" => 3000,
        "do_insurance" => true,
        "declared_value" => 3500,
        "length" => 20,
        "width" => 30,
        "height" => 10,
        "weight" => 6,
        "freeshipping" => true,
        "is_stopdesk" => false,
        "has_exchange" => false
    )
);

$postdata = json_encode($data);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    "X-API-ID: " . $api_id,
    "X-API-TOKEN: " . $api_token,
    "Content-Type: application/json"
));

$result = curl_exec($ch);
curl_close($ch);

echo $result;
```

#### Create parcel parameters

| Parameter | Required | Type | Description |
|---|---|---|---|
| `order_id` | required | string | Order ID of the parcel. It must be unique for each parcel in the same request. When a parcel is created, this `order_id` lets you know which tracking is linked to which order. |
| `from_wilaya_name` | required | string | Sender center's wilaya name. You can get available names from the Wilayas endpoint. |
| `firstname` | required | string | Receiver first name. |
| `familyname` | required | string | Receiver family name. |
| `contact_phone` | required | string | Receiver phone number. Must start with `0` and contain 9 digits for mobile or 8 digits for landline. Multiple numbers can be separated by commas. |
| `address` | required | string | Receiver address. |
| `to_commune_name` | required | string | Receiver commune name. You can get available commune names from the Communes endpoint. |
| `to_wilaya_name` | required | string | Receiver wilaya name. You can get available wilaya names from the Wilayas endpoint. |
| `product_list` | required | string | Description of shipment contents. |
| `price` | required | integer | Price to recover from receiver. Must be greater than or equal to `0` and less than or equal to `150000`. |
| `do_insurance` | required | boolean | Whether insurance applies. If `true`, `declared_value` is required. |
| `declared_value` | required | integer | Declared value of the shipment, between `0` and `150000`. |
| `length` | required | integer | Parcel content length in centimeters. Must be greater than or equal to `0`. |
| `width` | required | integer | Parcel content width in centimeters. Must be greater than or equal to `0`. |
| `height` | required | integer | Parcel content height in centimeters. Must be greater than or equal to `0`. |
| `weight` | required | integer | Parcel content weight in kilograms. Must be greater than or equal to `0`. |
| `freeshipping` | required | boolean | Whether delivery fee is paid by sender. `true` = paid by sender, `false` = paid by receiver. |
| `is_stopdesk` | required | boolean | Whether delivery is to a stopdesk or home delivery. `true` = stopdesk delivery, `false` = home delivery. |
| `stopdesk_id` | conditional | string | Required if `is_stopdesk` is `true`; otherwise optional. This is the center ID of the stopdesk where the parcel is sent. |
| `has_exchange` | required | boolean | Whether this is an exchange request. |
| `product_to_collect` | conditional | string | Required if `has_exchange` is `true`; otherwise optional. Designates what to return in the exchange parcel. |

#### Create parcels response

Returns `order_id` and the associated tracking for each parcel. Parcels with valid data are created successfully. Parcels with errors fail with `success: false`, and valid ones are still processed.

```json
{
  "MyFirstOrder": {
    "success": true,
    "order_id": "MyFirstOrder",
    "tracking": "yal-123456",
    "label": "https://api.yalidine.app/labels/yal-123456",
    "message": ""
  },
  "MySecondOrder": {
    "success": false,
    "order_id": "MySecondOrder",
    "tracking": null,
    "label": null,
    "message": "The do_insurance parameter must be of type boolean"
  }
}
```

### Edit parcels

Parcels can be edited only when their status is `en préparation`.

```http
PATCH /v1/parcels/{tracking}
```

Example body:

```json
{
  "firstname": "Yacine",
  "familyname": "Ali",
  "contact_phone": "0555123456",
  "address": "New address",
  "to_commune_name": "Ouled Fayet",
  "to_wilaya_name": "Alger",
  "product_list": "Updated product list",
  "price": 2500,
  "do_insurance": true,
  "declared_value": 3000,
  "length": 20,
  "width": 20,
  "height": 10,
  "weight": 4,
  "freeshipping": false,
  "is_stopdesk": false,
  "has_exchange": false
}
```

> Editing uses the same main parcel data fields as creation, but only editable fields should be sent. The official screenshot shows the edit section, but some details are not fully readable in the provided image.

### Delete parcels

Deleting a parcel is possible only if its last status is `en préparation`.

#### Method 1: delete one parcel by path

```http
DELETE /v1/parcels/yal-123456
```

#### Method 2: delete one or many parcels by tracking query parameter

```http
DELETE /v1/parcels/?tracking=yal-123456,yal-789101
```

If you choose the second method, separate tracking values with commas.

#### Delete parameters

| Parameter | Required | Type | Description |
|---|---|---|---|
| `tracking` | conditionally required | string | Required if using method 2. A string representing one or multiple parcels to delete, separated by commas. |

#### Delete response

Returns the deletion decision for each tracking, or an error.

```json
{
  "yal-123456": {
    "deleted": true
  },
  "yal-123457": {
    "deleted": false,
    "message": "Impossible for one of the following reasons: cannot be deleted, no such parcel, does not exist, or already deleted before."
  }
}
```

---

## Histories

Histories retrieves a parcel's status events. You can filter parcels by different attributes, or retrieve history details by tracking.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/histories/` | Retrieve parcel histories. |
| `GET` | `/histories/{tracking}` | Retrieve histories for a specific tracking code. |

### Retrieve histories

```http
GET /v1/histories/
```

Example:

```bash
curl --request GET \
  --url "https://api.yalidine.app/v1/histories/" \
  --header "X-API-ID: YOUR_API_ID" \
  --header "X-API-TOKEN: YOUR_API_TOKEN"
```

Example response:

```json
{
  "has_more": true,
  "total_data": 1000,
  "data": [
    {
      "tracking": "yal-123456",
      "date_status": "2019-01-01 10:30:00",
      "status": "Centre",
      "reason": "",
      "status_id": 1,
      "center_id": 10101,
      "center_name": "Centre de Adrar",
      "wilaya_id": 1,
      "wilaya_name": "Adrar",
      "commune_id": 101,
      "commune_name": "Adrar"
    }
  ],
  "links": {
    "self": "https://api.yalidine.app/v1/histories/"
  }
}
```

You can access all statuses of a specific parcel by supplying tracking in the path, or using the `tracking` query parameter.

```http
GET /v1/histories/yal-123456
GET /v1/histories/?tracking=yal-123456
```

### History filters

| Parameter | Type | Description |
|---|---|---|
| `tracking` | string | Identifier of the parcel. |
| `status` | string | Status of the parcel. Allowed values shown in the docs include: `Pas encore expédié`, `A vérifier`, `En préparation`, `Pas encore ramassé`, `Prêt à expédier`, `Ramassé`, `Bloqué`, `Débloqué`, `Transfert`, `Expédié`, `Centre`, `En localisation`, `Vers Wilaya`, `Reçu à Wilaya`, `Attente du client`, `Sorti en livraison`, `En alerte`, `Tentative échouée`, `Livré`, `Echec livraison`, `Retour vers centre`, `Retourné au centre`, `Retour transfert`, `Retour groupé`, `Retour à retirer`, `Retour vers vendeur`, `Retourné au vendeur`, `Echange échoué`. |
| `date_status` | string | Status date/time in `YYYY-MM-DD HH:MM:SS` format. You can use `date_status` to filter by exact date, `date_status>` for statuses after a date, and `date_status<` for statuses before a date. |
| `reason` | string | Reason of a failed delivery, returned parcel, or parcel hold. |
| `fields` | string | Comma-separated list of fields to return. |
| `page` | integer | Page number. |
| `page_size` | integer | Number of results per page. |
| `order_by` | string | Field to order by. |
| `asc` | null | Sort ascending. |
| `desc` | null | Sort descending. |

### History fields

| Field | Type | Description |
|---|---|---|
| `date_status` | string | Date/time of the status in `YYYY-MM-DD HH:MM:SS` format. |
| `tracking` | string | Unique parcel tracking code. |
| `status` | string | Status of the parcel. |
| `reason` | string | Reason of a failed delivery, return, or hold. |
| `status_id` | integer | Status identifier. |
| `center_id` | integer | Center identifier of the status place. |
| `center_name` | string | Center name of the status place. |
| `wilaya_id` | integer | Wilaya identifier of the status place. |
| `wilaya_name` | string | Wilaya name of the status place. |
| `commune_id` | integer | Commune identifier of the status place. |
| `commune_name` | string | Commune name of the status place. |

### History ordering

By default, histories are ordered by `tracking` in ascending order.

You can override the default with `order_by`. Supported values shown in the docs:

- `date_status`
- `tracking`
- `status`
- `reason`

Example:

```http
GET /v1/histories/?order_by=date_status
GET /v1/histories/?order_by=date_status&desc
```

---

## Centers

Centers retrieves Yalidine centers with their details, or filters centers according to your needs.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/centers/` | Retrieve centers. |
| `GET` | `/centers/{center_id}` | Retrieve one center. |

### Retrieve centers

```http
GET /v1/centers/
```

Example response:

```json
{
  "has_more": false,
  "total_data": 99,
  "data": [
    {
      "center_id": 10101,
      "name": "Centre de Adrar",
      "address": "Cité el Moudjahidine",
      "gps": "27.873233...,-0.299112...",
      "commune_id": 101,
      "commune_name": "Adrar",
      "wilaya_id": 1,
      "wilaya_name": "Adrar"
    }
  ],
  "links": {
    "self": "https://api.yalidine.app/v1/centers/"
  }
}
```

You can access a specific center by supplying its `center_id` in the path, or using the `center_id` parameter to retrieve many centers in the same request.

```http
GET /v1/centers/10101
GET /v1/centers/?center_id=10101,16001,190102
```

### Center filters

```http
GET /v1/centers/?wilaya_id=19
GET /v1/centers/?wilaya_id=16,19,6
```

| Parameter | Type | Description |
|---|---|---|
| `center_id` | integer | Identifier of the center. |
| `commune_id` | integer | Identifier of the center's commune. |
| `commune_name` | string | Commune name of the center. |
| `wilaya_id` | integer | Identifier of the center's wilaya. |
| `wilaya_name` | string | Wilaya name of the center. |
| `fields` | string | Comma-separated list of fields to return. |
| `page` | integer | Page number. |
| `page_size` | integer | Number of results per page. |
| `order_by` | string | Order field. Defaults to `center_id`. Supported values: `center_id`, `commune_id`, `wilaya_id`. |
| `desc` | null | Sort descending. |
| `asc` | null | Sort ascending. |

### Center fields

```http
GET /v1/centers/?fields=center_id,name
```

| Field | Type | Description |
|---|---|---|
| `center_id` | integer | Identifier of the center. |
| `name` | string | Center name. |
| `address` | string | Center address. |
| `gps` | string | Center longitude and latitude, separated by comma. |
| `commune_id` | integer | Identifier of the center's commune. |
| `commune_name` | string | Commune name of the center. |
| `wilaya_id` | integer | Identifier of the center's wilaya. |
| `wilaya_name` | string | Wilaya name of the center. |

### Center ordering

By default, centers are ordered by `center_id` in ascending order.

```http
GET /v1/centers/?order_by=commune_id
GET /v1/centers/?order_by=wilaya_id&desc
```

---

## Communes

Communes retrieves communes with their details, or filters communes according to your needs.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/communes/` | Retrieve communes. |
| `GET` | `/communes/{id}` | Retrieve one commune. |

### Retrieve communes

```http
GET /v1/communes/
```

Example response:

```json
{
  "has_more": true,
  "total_data": 1541,
  "data": [
    {
      "id": 101,
      "name": "Adrar",
      "wilaya_id": 1,
      "wilaya_name": "Adrar",
      "has_stop_desk": 1,
      "is_deliverable": 1,
      "delivery_time_parcel": 20,
      "delivery_time_payment": 10
    }
  ],
  "links": {
    "self": "https://api.yalidine.app/v1/communes/",
    "next": "https://api.yalidine.app/v1/communes/?page=2"
  }
}
```

You can access a specific commune by supplying its `id` in the path, or using the `id` parameter to retrieve many communes in the same request.

```http
GET /v1/communes/1630
GET /v1/communes/?id=1630,1601,1620
```

### Commune filters

```http
GET /v1/communes/?has_stop_desk=true
GET /v1/communes/?has_stop_desk=true&wilaya_id=16
GET /v1/communes/?wilaya_id=16,19,6
```

| Parameter | Type | Description |
|---|---|---|
| `id` | integer | Identifier of the commune. |
| `wilaya_id` | integer | Commune's wilaya ID. |
| `has_stop_desk` | boolean | Whether the commune has a stop desk. |
| `is_deliverable` | boolean | Whether the commune is deliverable. |
| `fields` | string | Comma-separated list of fields to return. |
| `page` | integer | Page number. |
| `page_size` | integer | Number of results per page. |
| `order_by` | string | Order field. Defaults to `id`. Supported values: `id`, `wilaya_id`. |
| `desc` | null | Sort descending. |
| `asc` | null | Sort ascending. |

### Commune fields

```http
GET /v1/communes/?fields=name,is_deliverable
```

| Field | Type | Description |
|---|---|---|
| `id` | integer | Identifier of the commune. |
| `name` | string | Commune name. |
| `wilaya_id` | integer | Wilaya ID of that commune. |
| `wilaya_name` | string | Wilaya name of that commune. |
| `has_stop_desk` | boolean | Whether this commune has a stop desk. |
| `is_deliverable` | boolean | Whether this commune is deliverable. |
| `delivery_time_parcel` | integer | Average parcel delivery time to this commune, in days. |
| `delivery_time_payment` | integer | Average payment delivery time from this commune, in days. |

### Commune ordering

By default, communes are ordered by `id` in ascending order.

```http
GET /v1/communes/?order_by=wilaya_id
GET /v1/communes/?order_by=wilaya_id&desc
```

---

## Wilayas

Wilayas retrieves the wilayas with all their details, or filters them according to your needs.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/wilayas/` | Retrieve wilayas. |
| `GET` | `/wilayas/{id}` | Retrieve one wilaya. |

### Retrieve wilayas

```http
GET /v1/wilayas/
```

Example response:

```json
{
  "has_more": false,
  "total_data": 58,
  "data": [
    {
      "id": 1,
      "name": "Adrar",
      "zone": 4,
      "is_deliverable": 1
    }
  ],
  "links": {
    "self": "https://api.yalidine.app/v1/wilayas/"
  }
}
```

You can access a specific wilaya by supplying its `id` in the path, or using the `id` parameter to retrieve many wilayas in the same request.

```http
GET /v1/wilayas/15
GET /v1/wilayas/?id=15,16,5
```

### Wilaya filters

```http
GET /v1/wilayas/?id=19
GET /v1/wilayas/?id=16,19,6
```

| Parameter | Type | Description |
|---|---|---|
| `id` | integer | Identifier of the wilaya. |
| `name` | string | Wilaya name. |
| `fields` | string | Comma-separated list of fields to return. |
| `page` | integer | Page number. |
| `page_size` | integer | Number of results per page. |
| `order_by` | string | Order field. Defaults to `id`. Supported values: `id`, `name`. |
| `desc` | null | Sort descending. |
| `asc` | null | Sort ascending. |

### Wilaya fields

```http
GET /v1/wilayas/?fields=id,name
```

| Field | Type | Description |
|---|---|---|
| `id` | integer | Identifier of the wilaya. |
| `name` | string | Wilaya name. |
| `zone` | integer | Wilaya zone. |
| `is_deliverable` | boolean | Whether the wilaya is deliverable. |

### Wilaya ordering

By default, wilayas are ordered by `id` in ascending order.

```http
GET /v1/wilayas/?order_by=name
GET /v1/wilayas/?order_by=name&desc
```

---

## Fees

The Fees endpoint retrieves all fees and their details by specifying the starting and destination wilayas.

### Endpoint

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/fees/?from_wilaya_id={id}&to_wilaya_id={id}` | Retrieve delivery fees between two wilayas. |

> You must supply both `from_wilaya_id` and `to_wilaya_id`.

### Retrieve fees

```http
GET /v1/fees/?from_wilaya_id=5&to_wilaya_id=1
```

Example response:

```json
{
  "from_wilaya_name": "Batna",
  "to_wilaya_name": "Adrar",
  "zone": 4,
  "retour_fee": 250,
  "cod_percentage": 0.75,
  "insurance_percentage": 0.75,
  "oversize_fee": 100,
  "per_commune": {
    "101": {
      "commune_id": 101,
      "commune_name": "Adrar",
      "express_home": 1400,
      "express_desk": 1100,
      "economic_home": null,
      "economic_desk": null
    },
    "119": {
      "commune_id": 119,
      "commune_name": "Akabli",
      "express_home": 1450,
      "express_desk": 1100,
      "economic_home": null,
      "economic_desk": null
    }
  }
}
```

### Fees response parameters

| Parameter | Type | Description |
|---|---|---|
| `from_wilaya_name` | string | Name of the starting wilaya. |
| `to_wilaya_name` | string | Name of the destination wilaya. |
| `zone` | integer | Zone number representing the route between starting and destination wilaya. |
| `retour_fee` | integer | Return fee for the zone. |
| `cod_percentage` | float | COD fee percentage, calculated on the higher value between declared value and price. |
| `insurance_percentage` | float | Insurance fee percentage, calculated on the higher value between declared value and price. |
| `oversize_fee` | integer | Fee applied when a parcel exceeds 5 KG. The first 5 KG are free. |
| `commune_id` | integer | Commune ID. |
| `commune_name` | string | Commune name. |
| `express_home` | integer | Express home delivery fee including commune tax. Does not include weight fee. |
| `express_desk` | integer | Express stop desk delivery fee including commune tax. Does not include weight fee. |
| `economic_home` | integer | Economy home delivery fee including commune tax, when applicable. Does not include weight fee. |
| `economic_desk` | integer | Economy stop desk delivery fee including commune tax, when applicable. Does not include weight fee. |

---

## Weight and oversize fee calculation

To calculate the overweight fee for a parcel, use this method:

```text
Volumetric weight = width(cm) × height(cm) × length(cm) × 0.0002
Actual weight = real parcel weight in KG
Billable weight = biggest value between volumetric weight and actual weight
```

Then calculate overweight fee:

```text
If billable_weight ≤ 5:
    overweight_fee = 0 DA

If billable_weight > 5:
    overweight_fee = (billable_weight - 5) × oversize_fee
```

Add the overweight fee to the delivery fee, which may be one of:

- `express_home`
- `express_desk`
- `economic_home`
- `economic_desk`

### Examples

Assume the threshold is `5 KG` and the oversize fee is `50 DA` per additional KG.

#### Parcel weighs 4 KG

The weight is under the 5 KG threshold.

```text
Cost = 0 DA
```

#### Parcel weighs 5 KG

The weight is exactly 5 KG.

```text
Cost = 0 DA
```

#### Parcel weighs 7 KG

The first 5 KG are free. The fee is charged for 2 additional KG.

```text
Cost = 2 KG × 50 DA = 100 DA
```

---

## Generic list endpoint usage pattern

The list-style endpoints (`wilayas`, `communes`, `centers`, `histories`, and `parcels`) follow a similar pattern:

```http
GET /v1/{resource}/
GET /v1/{resource}/{id_or_tracking}
GET /v1/{resource}/?fields=field1,field2
GET /v1/{resource}/?page=2&page_size=100
GET /v1/{resource}/?order_by=id&desc
```

Multiple values for a filter can generally be passed with commas:

```http
GET /v1/wilayas/?id=16,19,6
GET /v1/communes/?wilaya_id=16,19,6
GET /v1/centers/?center_id=10101,16001,190102
```

---

## Support

For API support, the official documentation lists:

```text
developer@yalidine.com
```

