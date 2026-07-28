const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'locales');
const files = ['en.json', 'fr.json', 'ar.json'];

const translations = {
  en: {
    title: "Messaging",
    subtitle: "Customize communication templates sent to your customers.",
    whatsappTemplate: {
      label: "WhatsApp Confirmation Template",
      hint: "Customize the message sent when you click 'Send WhatsApp' in the order details.",
      keywordsLabel: "Available keywords:",
      keywords: {
        customerName: "Customer's name",
        productsRecap: "List of ordered products",
        total: "Total amount with shipping",
        address: "Full delivery address (including wilaya/commune)",
        confirmLink: "The secure confirmation link"
      },
      preview: "Preview"
    }
  },
  fr: {
    title: "Messagerie",
    subtitle: "Personnalisez les modèles de communication envoyés à vos clients.",
    whatsappTemplate: {
      label: "Modèle de confirmation WhatsApp",
      hint: "Personnalisez le message envoyé lorsque vous cliquez sur 'Envoyer WhatsApp' dans les détails de la commande.",
      keywordsLabel: "Mots-clés disponibles :",
      keywords: {
        customerName: "Nom du client",
        productsRecap: "Liste des produits commandés",
        total: "Montant total avec livraison",
        address: "Adresse de livraison complète (y compris wilaya/commune)",
        confirmLink: "Le lien de confirmation sécurisé"
      },
      preview: "Aperçu"
    }
  },
  ar: {
    title: "المراسلة",
    subtitle: "تخصيص قوالب الاتصال المرسلة إلى عملائك.",
    whatsappTemplate: {
      label: "قالب تأكيد واتساب",
      hint: "قم بتخصيص الرسالة المرسلة عند النقر على 'إرسال واتساب' في تفاصيل الطلب.",
      keywordsLabel: "الكلمات الدلالية المتاحة:",
      keywords: {
        customerName: "اسم العميل",
        productsRecap: "قائمة المنتجات المطلوبة",
        total: "المبلغ الإجمالي مع الشحن",
        address: "عنوان التسليم الكامل (بما في ذلك الولاية/البلدية)",
        confirmLink: "رابط التأكيد الآمن"
      },
      preview: "معاينة"
    }
  }
};

for (const file of files) {
  const lang = file.split('.')[0];
  const filePath = path.join(localesDir, file);
  
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.admin) data.admin = {};
    if (!data.admin.functionalSettingsForm) data.admin.functionalSettingsForm = {};
    
    data.admin.functionalSettingsForm.messaging = translations[lang];
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${file}`);
  }
}
