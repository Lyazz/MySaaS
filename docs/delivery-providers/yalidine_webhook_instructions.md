# Yalidine Webhook Integration Instructions

This guide explains how to create, validate, secure, test, and operate Yalidine webhooks in your application.

> Source: Yalidine webhook documentation screenshot/PDF provided in this conversation.

---

## 1. What Yalidine Webhooks Do

Yalidine webhooks send event notifications from Yalidine to your application whenever a subscribed parcel event occurs.

Your application must expose an HTTPS endpoint that can receive HTTP `POST` requests in JSON format.

Typical use cases include:

- Creating or updating local parcel records.
- Tracking parcel status changes.
- Detecting parcel deletion events.
- Updating payment or collection state.
- Triggering internal workflows when Yalidine parcel data changes.

---

## 2. Webhook Receiving Flow

To receive webhook notifications:

1. Create a webhook endpoint on your server using HTTPS.
2. Your endpoint must return a `200` response status and a valid `crc_token` during validation.
3. Create the webhook from the Yalidine Webhooks Dashboard.
4. Develop and test your endpoint using the webhook test page.
5. When the webhook is ready, change its status to `active`.
6. Yalidine will then send notifications as subscribed events occur.

---

## 3. Requirements for Your Endpoint

Your webhook endpoint must:

- Be reachable through HTTPS.
- Accept `POST` requests.
- Accept JSON payloads.
- Respond in less than 10 seconds.
- Return HTTP status `200` for successful delivery.
- Support Yalidine's challenge-response validation using `crc_token`.
- Verify the webhook signature sent by Yalidine.
- Be idempotent, because duplicate events may occur.
- Preserve event ordering where possible.

Recommended endpoint example:

```text
https://example.com/webhooks/yalidine
```

---

## 4. Creating a Webhook in Yalidine

Before creating a webhook subscription, create and deploy the receiving endpoint on your server.

In the Yalidine dashboard:

1. Go to **Webhooks Dashboard**.
2. Click **Add**.
3. Fill in the webhook details:
   - **Webhook Name**: an internal name to identify the webhook.
   - **URL of reception**: the HTTPS endpoint on your server.
   - **Email**: an address where Yalidine can send event notifications or alerts.
   - **Event types**: select one or more event types to subscribe to.
4. Click **Proceed**.

When you click **Proceed**, Yalidine validates the endpoint. The webhook is created only if validation succeeds.

After creation, the webhook is automatically disabled. You can then:

- Test the webhook.
- Enable it when your integration is ready.

---

## 5. Challenge-Response Validation

Yalidine validates webhook endpoints using a challenge-response check.

Validation occurs:

- When a webhook is created.
- When a webhook is edited.
- Periodically for already-created webhooks.

During validation, Yalidine sends a `GET` request to your endpoint with two query parameters:

```text
subscribe
crc_token
```

Your endpoint must:

1. Detect that both `subscribe` and `crc_token` are present.
2. Return a JSON response containing the received `crc_token` value.
3. Return the response within 10 seconds.
4. Return HTTP status `200`.

Example validation response:

```json
{
  "crc_token": "the-token-received-from-query-string"
}
```

### PHP validation example

```php
<?php

if (isset($_GET['subscribe']) && isset($_GET['crc_token'])) {
    header('Content-Type: application/json');
    http_response_code(200);

    echo json_encode([
        'crc_token' => $_GET['crc_token'],
    ]);
    exit;
}

// Continue with normal webhook POST handling below.
```

> Important: Keep this validation logic permanently available. Yalidine may revalidate your endpoint from time to time. If validation fails, the webhook can be disabled.

---

## 6. Event Format

Yalidine sends webhook payloads to your endpoint in JSON format using `POST` requests.

Each payload contains two top-level fields:

```json
{
  "type": "parcel_created",
  "events": []
}
```

### `type`

The `type` field describes the webhook event type. Your endpoint should use this value to decide how to process the payload.

Example:

```json
"type": "parcel_status_updated"
```

### `events`

The `events` field is an array containing one or more event objects.

Each item in `events` contains:

| Field | Description |
|---|---|
| `event_id` | Unique identifier of the event. Use this to prevent duplicate processing. |
| `occurred_at` | Timestamp showing when the event was generated. Use this to preserve event order. |
| `data` | Event-specific payload. Its structure changes depending on the event type. |

Example shape:

```json
{
  "type": "parcel_status_updated",
  "events": [
    {
      "event_id": "evt_123456789",
      "occurred_at": "2026-05-09 14:55:00",
      "data": {
        "tracking": "YAL-123456",
        "status": "in delivery"
      }
    }
  ]
}
```

---

## 7. Supported Event Types

Yalidine documentation lists the following webhook events:

| Event type | Meaning |
|---|---|
| `parcel_created` | A parcel was created. |
| `parcel_edited` | A parcel was edited. |
| `parcel_deleted` | A parcel was deleted. |
| `parcel_status_updated` | A parcel status changed. |
| `parcel_payment_updated` | A parcel payment state changed. |

---

## 8. Recommended Webhook Handler Logic

A webhook handler should process requests in this order:

1. Handle Yalidine validation requests.
2. Reject unsupported HTTP methods.
3. Read the raw request body.
4. Verify the signature.
5. Parse the JSON payload.
6. Validate required fields.
7. Check whether each `event_id` was already processed.
8. Process events according to their `type`.
9. Return HTTP `200` quickly.
10. Perform slow work asynchronously when possible.

---

## 9. PHP Webhook Endpoint Example

```php
<?php

// yalidine-webhook.php

$secretKey = getenv('YALIDINE_WEBHOOK_SECRET');

// 1. Challenge-response validation
if (isset($_GET['subscribe']) && isset($_GET['crc_token'])) {
    header('Content-Type: application/json');
    http_response_code(200);

    echo json_encode([
        'crc_token' => $_GET['crc_token'],
    ]);
    exit;
}

// 2. Only allow POST for event delivery
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method Not Allowed';
    exit;
}

// 3. Read raw body
$rawBody = file_get_contents('php://input');

// 4. Verify signature
$signature = $_SERVER['HTTP_X_YALIDINE_SIGNATURE'] ?? '';
$expectedSignature = hash_hmac('sha256', $rawBody, $secretKey);

if (!$signature || !hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    echo 'Invalid signature';
    exit;
}

// 5. Decode payload
$payload = json_decode($rawBody, true);

if (!is_array($payload) || !isset($payload['type'], $payload['events'])) {
    http_response_code(400);
    echo 'Invalid payload';
    exit;
}

$type = $payload['type'];
$events = $payload['events'];

foreach ($events as $event) {
    $eventId = $event['event_id'] ?? null;
    $occurredAt = $event['occurred_at'] ?? null;
    $data = $event['data'] ?? [];

    if (!$eventId) {
        continue;
    }

    // TODO: Check if $eventId was already processed.
    // If already processed, skip it to avoid duplicate work.

    switch ($type) {
        case 'parcel_created':
            // TODO: Create parcel locally.
            break;

        case 'parcel_edited':
            // TODO: Update parcel details locally.
            break;

        case 'parcel_deleted':
            // TODO: Mark parcel as deleted locally.
            break;

        case 'parcel_status_updated':
            // TODO: Update local parcel status.
            break;

        case 'parcel_payment_updated':
            // TODO: Update local payment information.
            break;

        default:
            // Unknown event type. Log and ignore.
            break;
    }

    // TODO: Store event_id as processed after successful handling.
}

http_response_code(200);
echo 'OK';
```

---

## 10. Signature Verification

Yalidine signs every webhook request using a secret key.

The signature is sent in this header:

```text
X-YALIDINE-SIGNATURE
```

The signature is generated using:

```text
HMAC-SHA256(raw_request_body, secret_key)
```

To verify a request:

1. Read the raw request body exactly as received.
2. Generate an HMAC-SHA256 hash using your webhook secret key.
3. Compare your generated hash with the `X-YALIDINE-SIGNATURE` header.
4. Use a timing-safe comparison function where available.
5. Reject the request if the signature is missing or invalid.

### PHP signature verification

```php
$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_YALIDINE_SIGNATURE'] ?? '';
$expectedSignature = hash_hmac('sha256', $rawBody, $secretKey);

if (!$signature || !hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}
```

### Security notes

- Never hard-code the secret key in your codebase.
- Store it in an environment variable or secret manager.
- Rotate the secret key if it is leaked.
- Always verify the signature before processing the payload.

---

## 11. Response Requirements

Your endpoint must return a `200` response code in less than 10 seconds.

Recommended response behavior:

1. Validate the request.
2. Store or queue the payload.
3. Return `200` immediately.
4. Process time-consuming tasks in the background.
5. Track processed `event_id` values to avoid duplicates.

Avoid doing slow operations before returning `200`, such as:

- Sending emails.
- Calling third-party APIs.
- Running heavy calculations.
- Long database operations.

---

## 12. Retry Policy

If your endpoint does not respond with HTTP `200` in less than 10 seconds, Yalidine treats the delivery as failed and retries it.

The retry policy allows up to 7 delivery attempts.

| Attempt | Delay before attempt |
|---:|---|
| 1 | Immediately |
| 2 | 5 minutes after the previous attempt |
| 3 | 15 minutes after the previous attempt |
| 4 | 1 hour after the previous attempt |
| 5 | 3 hours after the previous attempt |
| 6 | 12 hours after the previous attempt |
| 7 | 1 day after the previous attempt |

If the final attempt fails, the webhook is automatically disabled.

> Note: Retry intervals are counted from the previous attempt, not from the original event time. The full retry cycle can run for about 40 hours after the first attempt.

---

## 13. Duplicate Events and Idempotency

Yalidine may deliver the same event more than once.

To avoid duplicate processing:

- Store every processed `event_id`.
- Check whether an event has already been processed before handling it.
- Make updates idempotent where possible.
- Use database transactions around event processing.

Example database table:

```sql
CREATE TABLE webhook_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    occurred_at DATETIME NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Example flow:

```text
Receive event -> Check event_id -> Process only if new -> Store event_id -> Return 200
```

---

## 14. Event Ordering

Events may arrive in the wrong order.

Yalidine recommends using `occurred_at` to preserve event order.

Recommended practices:

- Compare incoming `occurred_at` with the latest event timestamp stored for the parcel.
- Ignore or review older events if a newer event was already processed.
- Keep a full event history for debugging.
- Do not assume that the first received event is the oldest event.

---

## 15. Enabling and Disabling a Webhook

To change a webhook status:

1. Go to **Webhooks Dashboard**.
2. Open the webhook card you want to edit.
3. Change the status.
4. Save the change.

If a webhook is disabled:

- You will not receive new events.
- Events already in the queue may still follow the retry policy.
- Queued events are deleted if they have consumed all possible retry attempts.
- If the webhook is re-enabled before deletion, queued events can be received normally.

---

## 16. Testing Your Endpoint

To test a webhook endpoint:

1. Go to **Webhooks Dashboard**.
2. Open the webhook card you want to test.
3. Click **Test**.
4. Yalidine sends one event type that you subscribed to.
5. Your application receives a webhook delivery containing sample data.
6. The result appears after clicking the test button.

Test deliveries are not added to the webhook log.

Recommended tests:

- Validation request returns the expected `crc_token`.
- Signature verification succeeds with the configured secret key.
- Invalid signatures are rejected.
- JSON payload is parsed correctly.
- Every subscribed event type is handled.
- Duplicate `event_id` values are ignored.
- Endpoint returns `200` quickly.

---

## 17. Viewing Logs

Webhook logs are available from the dashboard.

To view logs:

1. Go to **Webhooks Dashboard**.
2. Open the webhook card you want to inspect.

Logs are kept for 48 hours.

When a webhook is deleted, its logs are also deleted.

---

## 18. Editing a Webhook

To edit a webhook:

1. Go to **Webhooks Dashboard**.
2. Open the webhook card you want to edit.
3. Make the required changes.
4. Click **Proceed**.

When a webhook is edited, Yalidine validates the endpoint again. The edit is added to the webhook log.

---

## 19. Deleting a Webhook

To delete a webhook:

1. Go to **Webhooks Dashboard**.
2. Open the webhook card you want to delete.
3. Delete the webhook.

Deleting a webhook also deletes its logs.

---

## 20. Best Practices Checklist

Use this checklist before enabling your webhook in production.

### Validation

- [ ] Endpoint handles `GET` validation requests.
- [ ] Endpoint returns `crc_token` in JSON.
- [ ] Validation logic remains available permanently.

### Delivery

- [ ] Endpoint accepts `POST` requests.
- [ ] Endpoint parses JSON correctly.
- [ ] Endpoint returns HTTP `200` in less than 10 seconds.
- [ ] Slow processing is moved to a background queue.

### Security

- [ ] `X-YALIDINE-SIGNATURE` is verified.
- [ ] HMAC-SHA256 uses the raw request body.
- [ ] Timing-safe comparison is used.
- [ ] Secret key is stored securely.

### Reliability

- [ ] `event_id` is stored to prevent duplicate processing.
- [ ] `occurred_at` is used to handle ordering.
- [ ] Unknown event types are logged and ignored safely.
- [ ] Failed processing is logged internally.

### Operations

- [ ] Webhook has been tested from Yalidine dashboard.
- [ ] Logs are monitored during rollout.
- [ ] Alerts are configured for repeated failures.
- [ ] Webhook is enabled only after successful testing.

---

## 21. Example Laravel Route

```php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

Route::match(['GET', 'POST'], '/webhooks/yalidine', function (Request $request) {
    // Challenge-response validation
    if ($request->query('subscribe') !== null && $request->query('crc_token') !== null) {
        return response()->json([
            'crc_token' => $request->query('crc_token'),
        ], 200);
    }

    if (!$request->isMethod('post')) {
        return response('Method Not Allowed', 405);
    }

    $rawBody = $request->getContent();
    $secret = config('services.yalidine.webhook_secret');
    $signature = $request->header('X-YALIDINE-SIGNATURE');
    $expected = hash_hmac('sha256', $rawBody, $secret);

    if (!$signature || !hash_equals($expected, $signature)) {
        return response('Invalid signature', 401);
    }

    $payload = json_decode($rawBody, true);

    if (!isset($payload['type'], $payload['events']) || !is_array($payload['events'])) {
        return response('Invalid payload', 400);
    }

    foreach ($payload['events'] as $event) {
        // Dispatch to a queue in production.
        Log::info('Yalidine webhook received', [
            'type' => $payload['type'],
            'event_id' => $event['event_id'] ?? null,
            'occurred_at' => $event['occurred_at'] ?? null,
        ]);
    }

    return response('OK', 200);
});
```

---

## 22. Environment Configuration

Example `.env` entry:

```env
YALIDINE_WEBHOOK_SECRET=your-secret-key-here
```

Example Laravel config entry:

```php
// config/services.php

return [
    'yalidine' => [
        'webhook_secret' => env('YALIDINE_WEBHOOK_SECRET'),
    ],
];
```

---

## 23. Production Deployment Notes

Before going live:

1. Deploy the endpoint over HTTPS.
2. Configure the secret key.
3. Create the webhook in Yalidine.
4. Pass endpoint validation.
5. Send a test event.
6. Confirm that logs show successful delivery.
7. Enable the webhook.
8. Monitor delivery for the first 48 hours.

---

## 24. Common Failure Causes

| Problem | Cause | Fix |
|---|---|---|
| Validation fails | Endpoint does not return `crc_token` | Implement challenge-response handling. |
| Signature fails | Wrong secret key or altered body | Use the raw body and correct secret. |
| Webhook retries | Endpoint does not return `200` quickly | Queue processing and return early. |
| Duplicate processing | Same event delivered more than once | Store and check `event_id`. |
| Missing updates | Webhook disabled | Re-enable webhook and inspect logs. |
| Events out of order | Network/retry timing | Use `occurred_at` to reconcile order. |

---

## 25. Minimal Endpoint Contract

Your Yalidine webhook endpoint should support this contract:

```text
GET /webhooks/yalidine?subscribe=1&crc_token=abc123
-> 200 application/json
-> {"crc_token":"abc123"}

POST /webhooks/yalidine
Headers:
  Content-Type: application/json
  X-YALIDINE-SIGNATURE: <hmac-sha256>
Body:
  {"type":"parcel_created","events":[...]}
-> 200 text/plain
-> OK
```

---

## 26. Final Implementation Summary

A production-ready Yalidine webhook integration should:

- Create an HTTPS endpoint.
- Support challenge-response validation.
- Verify `X-YALIDINE-SIGNATURE` using HMAC-SHA256.
- Accept JSON `POST` payloads.
- Handle all subscribed event types.
- Return `200` within 10 seconds.
- Store `event_id` values to avoid duplicate processing.
- Use `occurred_at` to preserve event order.
- Monitor dashboard logs, which are retained for 48 hours.
- Test thoroughly before enabling the webhook.
