class DeliveryProvider {
  final String id;
  final String name;
  final String description;
  final bool isEnabled;

  DeliveryProvider({
    required this.id,
    required this.name,
    required this.description,
    this.isEnabled = false,
  });

  DeliveryProvider copyWith({bool? isEnabled}) {
    return DeliveryProvider(
      id: id,
      name: name,
      description: description,
      isEnabled: isEnabled ?? this.isEnabled,
    );
  }
}
