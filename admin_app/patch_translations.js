const fs = require('fs');

const enKeys = {
  receipt: {
    editor: {
      title: "Edit Receipt Layout",
      tabEditor: "Editor",
      tabPreview: "Preview",
      saveLayout: "Save Layout",
      storeInformation: "Store Information",
      showLogo: "Show Logo",
      showStoreName: "Show Store Name",
      storeNameOverride: "Store Name Override (Optional)",
      showStoreAddress: "Show Store Address",
      storeAddressOverride: "Store Address Override (Optional)",
      showStorePhone: "Show Store Phone",
      storePhoneOverride: "Store Phone Override (Optional)",
      showStoreEmail: "Show Store Email",
      storeEmailOverride: "Store Email Override (Optional)",
      headerLegacy: "Header (Legacy)",
      showCustomHeader: "Show Custom Header Text",
      headerText: "Header Text",
      content: "Content",
      showOrderNumber: "Show Order Number",
      showDate: "Show Date & Time",
      showCustomerInfo: "Show Customer Info",
      showTaxBreakdown: "Show Tax Breakdown",
      footer: "Footer",
      showFooterMessage: "Show Footer Message",
      footerText: "Footer Text",
      printAsImage: "Print as Image (Arabic Support)"
    },
    print: {
      item: "Item",
      qty: "Qty",
      price: "Price",
      total: "Total",
      discount: "Discount",
      grandTotal: "TOTAL",
      orderNum: "Order #{id}",
      customer: "Customer: {name}",
      phone: "Phone: {phone}",
      tel: "Tel: {phone}",
      email: "Email: {email}"
    }
  }
};

const frKeys = {
  receipt: {
    editor: {
      title: "Modifier la mise en page du reçu",
      tabEditor: "Éditeur",
      tabPreview: "Aperçu",
      saveLayout: "Enregistrer",
      storeInformation: "Informations de la boutique",
      showLogo: "Afficher le logo",
      showStoreName: "Afficher le nom de la boutique",
      storeNameOverride: "Remplacer le nom de la boutique (Optionnel)",
      showStoreAddress: "Afficher l'adresse",
      storeAddressOverride: "Remplacer l'adresse (Optionnel)",
      showStorePhone: "Afficher le téléphone",
      storePhoneOverride: "Remplacer le téléphone (Optionnel)",
      showStoreEmail: "Afficher l'email",
      storeEmailOverride: "Remplacer l'email (Optionnel)",
      headerLegacy: "En-tête (Ancien)",
      showCustomHeader: "Afficher un texte d'en-tête personnalisé",
      headerText: "Texte d'en-tête",
      content: "Contenu",
      showOrderNumber: "Afficher le numéro de commande",
      showDate: "Afficher la date et l'heure",
      showCustomerInfo: "Afficher les informations du client",
      showTaxBreakdown: "Afficher les taxes",
      footer: "Pied de page",
      showFooterMessage: "Afficher le message de pied de page",
      footerText: "Texte de pied de page",
      printAsImage: "Imprimer comme image (Support Arabe)"
    },
    print: {
      item: "Article",
      qty: "Qté",
      price: "Prix",
      total: "Total",
      discount: "Remise",
      grandTotal: "TOTAL",
      orderNum: "Commande n°{id}",
      customer: "Client : {name}",
      phone: "Téléphone : {phone}",
      tel: "Tél : {phone}",
      email: "Email : {email}"
    }
  }
};

const arKeys = {
  receipt: {
    editor: {
      title: "تعديل تخطيط الإيصال",
      tabEditor: "المحرر",
      tabPreview: "معاينة",
      saveLayout: "حفظ التخطيط",
      storeInformation: "معلومات المتجر",
      showLogo: "عرض الشعار",
      showStoreName: "عرض اسم المتجر",
      storeNameOverride: "تجاوز اسم المتجر (اختياري)",
      showStoreAddress: "عرض العنوان",
      storeAddressOverride: "تجاوز العنوان (اختياري)",
      showStorePhone: "عرض الهاتف",
      storePhoneOverride: "تجاوز الهاتف (اختياري)",
      showStoreEmail: "عرض البريد الإلكتروني",
      storeEmailOverride: "تجاوز البريد الإلكتروني (اختياري)",
      headerLegacy: "الترويسة (قديم)",
      showCustomHeader: "عرض نص ترويسة مخصص",
      headerText: "نص الترويسة",
      content: "المحتوى",
      showOrderNumber: "عرض رقم الطلب",
      showDate: "عرض التاريخ والوقت",
      showCustomerInfo: "عرض معلومات العميل",
      showTaxBreakdown: "عرض تفاصيل الضرائب",
      footer: "التذييل",
      showFooterMessage: "عرض رسالة التذييل",
      footerText: "نص التذييل",
      printAsImage: "طباعة كصورة (دعم اللغة العربية)"
    },
    print: {
      item: "العنصر",
      qty: "الكمية",
      price: "السعر",
      total: "المجموع",
      discount: "الخصم",
      grandTotal: "المجموع الكلي",
      orderNum: "طلب #{id}",
      customer: "العميل: {name}",
      phone: "الهاتف: {phone}",
      tel: "هاتف: {phone}",
      email: "البريد الإلكتروني: {email}"
    }
  }
};

const files = [
  { path: 'assets/translations/en.json', keys: enKeys },
  { path: 'assets/translations/fr.json', keys: frKeys },
  { path: 'assets/translations/ar.json', keys: arKeys },
];

files.forEach(file => {
  if (fs.existsSync(file.path)) {
    const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
    // Merge into "admin" object since it seems settings are under admin
    if (!data.admin) data.admin = {};
    data.admin.receipt = file.keys.receipt;
    fs.writeFileSync(file.path, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated ${file.path}`);
  } else {
    console.log(`File not found: ${file.path}`);
  }
});
