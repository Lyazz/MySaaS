class AdminNotification {
  final String id;
  final String? deliveryId;
  final String type;
  final String entityType;
  final String entityId;
  final String title;
  final String body;
  final Map<String, String> data;
  final DateTime? readAt;
  final DateTime createdAt;

  const AdminNotification({
    required this.id,
    this.deliveryId,
    required this.type,
    required this.entityType,
    required this.entityId,
    required this.title,
    required this.body,
    required this.data,
    this.readAt,
    required this.createdAt,
  });

  bool get isUnread => readAt == null;

  factory AdminNotification.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? json['eventId'] ?? '').toString();
    final rawData = json['data'];
    final data = rawData is Map
        ? rawData.map(
            (key, value) => MapEntry(key.toString(), value?.toString() ?? ''),
          )
        : <String, String>{};

    return AdminNotification(
      id: id,
      deliveryId: json['deliveryId']?.toString(),
      type: json['type']?.toString() ?? '',
      entityType: json['entityType']?.toString() ?? '',
      entityId: json['entityId']?.toString() ?? '',
      title: json['title']?.toString() ?? 'New notification',
      body: json['body']?.toString() ?? '',
      data: data,
      readAt: _parseDate(json['readAt']),
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
    );
  }

  factory AdminNotification.fromPush({
    required String title,
    required String body,
    required Map<String, String> data,
  }) {
    final id =
        data['notificationId'] ??
        data['eventId'] ??
        data['orderId'] ??
        DateTime.now().microsecondsSinceEpoch.toString();

    return AdminNotification(
      id: id,
      type: data['type'] ?? '',
      entityType: data['entityType'] ?? '',
      entityId: data['entityId'] ?? data['orderId'] ?? '',
      title: title,
      body: body,
      data: data,
      createdAt: DateTime.now(),
    );
  }

  AdminNotification copyWith({DateTime? readAt}) {
    return AdminNotification(
      id: id,
      deliveryId: deliveryId,
      type: type,
      entityType: entityType,
      entityId: entityId,
      title: title,
      body: body,
      data: data,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt,
    );
  }

  static DateTime? _parseDate(Object? value) {
    final text = value?.toString().trim();
    if (text == null || text.isEmpty) return null;
    return DateTime.tryParse(text);
  }
}
