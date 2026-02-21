const fs = require('fs');

const enExtras = {
    "notFound": {
        "title": "Page not found",
        "message": "The page you are looking for does not exist."
    },
    "generic": {
        "title": "An error occurred",
        "message": "Something went wrong. Please try again later."
    },
    "actions": {
        "backHome": "Back to Home"
    },
    "details": "Error details"
};

const frExtras = {
    "notFound": {
        "title": "Page introuvable",
        "message": "La page que vous recherchez n'existe pas."
    },
    "generic": {
        "title": "Une erreur s'est produite",
        "message": "Quelque chose s'est mal passé. Veuillez réessayer plus tard."
    },
    "actions": {
        "backHome": "Retour à l'accueil"
    },
    "details": "Détails de l'erreur"
};

const arExtras = {
    "notFound": {
        "title": "الصفحة غير موجودة",
        "message": "الصفحة التي تبحث عنها غير موجودة."
    },
    "generic": {
        "title": "حدث خطأ",
        "message": "حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقًا."
    },
    "actions": {
        "backHome": "العودة للرئيسية"
    },
    "details": "تفاصيل الخطأ"
};

const langs = ['en', 'fr', 'ar'];
const extras = [enExtras, frExtras, arExtras];

langs.forEach((lang, idx) => {
    const path = `./locales/${lang}.json`;
    let data = {};
    if (fs.existsSync(path)) {
        data = JSON.parse(fs.readFileSync(path, 'utf8'));
    }

    if (!data.common) data.common = {};
    if (!data.common.errorPage) data.common.errorPage = {};

    data.common.errorPage = { ...data.common.errorPage, ...extras[idx] };

    fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
});
console.log('Translations inserted.');
