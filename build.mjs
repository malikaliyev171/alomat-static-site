import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceRoot = __dirname;
const outputRoot = path.resolve(__dirname, "dist");
const assetRoot = path.join(outputRoot, "assets");
const versionedStylesFile = "styles.css";
const versionedAppFile = "app.js";
const assetVersion = createHash("sha256")
  .update(readFileSync(path.join(sourceRoot, "styles.css")))
  .update(readFileSync(path.join(sourceRoot, "app.js")))
  .digest("hex")
  .slice(0, 10);
const inlineStyles = readFileSync(path.join(sourceRoot, "styles.css"), "utf8").replace(/<\/style/gi, "<\\/style");
const inlineApp = readFileSync(path.join(sourceRoot, "app.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const fallbackLogoImage = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" rx="24" fill="#05070d"/><circle cx="45" cy="50" r="22" fill="#ff4d32"/><path d="M28 50h34" stroke="#efeff2" stroke-width="8" stroke-linecap="round"/><text x="78" y="56" fill="#efeff2" font-family="Arial, sans-serif" font-size="19" font-weight="700">.alomat</text></svg>`,
)}`;

const site = {
  name: ".alomat",
  appStoreUrl: "https://alomat.uz",
  socials: [
    {
      label: "X",
      href: "https://x.com/alomat",
      handle: "@alomat",
    },
    {
      label: "IG",
      href: "https://www.instagram.com/alomat",
      handle: "@alomat",
    },
    {
      label: "TT",
      href: "https://www.tiktok.com/@alomat",
      handle: "@alomat",
    },
    {
      label: "YT",
      href: "https://www.youtube.com/@alomat",
      handle: "@alomat",
    },
  ],
};

const pages = [
  {
    key: "home",
    slug: "",
    title: {
      uz: ".alomat | Muhim bo'lgan narsalar uchun editorial signal qatlami",
      en: ".alomat | Editorial signal layer for what matters now",
      tr: ".alomat | \u015eimdi \u00f6nemli olanlar i\u00e7in editoryal sinyal katman\u0131",
    },
    description: {
      uz: "Shovqin ichidan kerakli signallarni ajratib beradigan, o'qilishi oson va bilingv editorial sayt.",
      en: "A bilingual editorial site that separates useful signals from the noise.",
      tr: "G\u00fcr\u00fclt\u00fcn\u00fcn i\u00e7inden yararl\u0131 sinyalleri ay\u0131ran, okunmas\u0131 kolay bir editoryal site.",
    },
  },
  {
    key: "about",
    slug: "about",
    title: {
      uz: "Manifesto | .alomat",
      en: "Manifesto | .alomat",
      tr: "Manifesto | .alomat",
    },
    description: {
      uz: ".alomat nima ekanini, nima emasligini va nega borligini tushuntiradigan manifest sahifa.",
      en: "The manifesto page that explains what .alomat is, what it is not, and why it exists.",
      tr: ".alomat'\u0131n ne oldu\u011funu, ne olmad\u0131\u011f\u0131n\u0131 ve neden var oldu\u011funu anlatan manifesto sayfas\u0131.",
    },
  },
  {
    key: "library",
    slug: "library",
    title: {
      uz: "Kutubhona | .alomat",
      en: "Library | .alomat",
      tr: "K\u00fct\u00fcphane | .alomat",
    },
    description: {
      uz: "Saqlangan signallar, yoqtirilgan hikoyalar va shaxsiy ro'yxatlar uchun bilingv kutubxona sahifasi.",
      en: "A bilingual library page for saved signals, liked stories, and personal collections.",
      tr: "Kaydedilen sinyaller, be\u011fenilen hikâyeler ve ki\u015fisel koleksiyonlar i\u00e7in k\u00fct\u00fcphane sayfas\u0131.",
    },
  },
  {
    key: "relay",
    slug: "relay",
    title: {
      uz: "Relay | .alomat",
      en: "Relay | .alomat",
      tr: "Relay | .alomat",
    },
    description: {
      uz: "Kundalik qisqa xabarnomalar, ritmik yangilanishlar va uzatmalar sahifasi.",
      en: "A page for short briefings, rhythmic updates, and signal delivery.",
      tr: "K\u0131sa b\u00fcltenler, ritmik g\u00fcncellemeler ve sinyal iletimi i\u00e7in bir sayfa.",
    },
  },
  {
    key: "contact",
    slug: "contact",
    title: {
      uz: "Aloqa | .alomat",
      en: "Contact | .alomat",
      tr: "\u0130leti\u015fim | .alomat",
    },
    description: {
      uz: "Signal yuborish, tahrirga yozish yoki hamkorlik so'rash uchun aloqa sahifasi.",
      en: "A contact page for sending signals, reaching the editors, or asking about partnerships.",
      tr: "Sinyal g\u00f6ndermek, edit\u00f6rlere ula\u015fmak veya i\u015f birli\u011fi konu\u015fmak i\u00e7in ileti\u015fim sayfas\u0131.",
    },
  },
  {
    key: "sponsor",
    slug: "sponsor",
    title: {
      uz: "Homiylik | .alomat",
      en: "Sponsor | .alomat",
      tr: "Sponsorluk | .alomat",
    },
    description: {
      uz: "Brendlar uchun ochiq belgilangan homiylik modellari va joylashuvlar.",
      en: "Clearly labeled sponsorship options and placements for brands.",
      tr: "Markalar i\u00e7in a\u00e7\u0131k\u00e7a etiketlenmi\u015f sponsorluk se\u00e7enekleri ve yerle\u015fimler.",
    },
  },
  {
    key: "lineup",
    slug: "lineup",
    title: {
      uz: "Alomat Lineup | .alomat",
      en: "Alomat Lineup | .alomat",
      tr: "Alomat Lineup | .alomat",
    },
    description: {
      uz: "Muharrir tanlagan yozuvchilar, maqolalar va qo'shilish uchun ariza.",
      en: "Editor-selected writers, articles, and the application path to join.",
      tr: "Edit\u00f6r\u00fcn se\u00e7ti\u011fi yazarlar, yaz\u0131lar ve kat\u0131lmak i\u00e7in ba\u015fvuru yolu.",
    },
  },
  {
    key: "privacy",
    slug: "privacy",
    title: {
      uz: "Maxfiylik siyosati | .alomat",
      en: "Privacy Policy | .alomat",
      tr: "Gizlilik Politikas\u0131 | .alomat",
    },
    description: {
      uz: "Qaysi ma'lumotlar yig'ilishi, nima uchun va foydalanuvchi nazorati haqida.",
      en: "What data is collected, why it is collected, and what control the user has.",
      tr: "Hangi verilerin neden topland\u0131\u011f\u0131 ve kullan\u0131c\u0131n\u0131n hangi kontrollere sahip oldu\u011fu hakk\u0131nda.",
    },
  },
];

const homeTimelineStories = [
  {
    id: 91802,
    shift: 10,
    image:
      "https://cdn1.wiro.ai/6f3f0c22-6f31f34b-2db1b2ec-2acb4d53-5cf1d0f7-92afc63a-3fd2b7a4-0c9f3b7e-551bcffd/2338001_Image.png",
    title: {
      uz: "Xbox katta qayta sozlash bilan 3 200 xodimni qisqartirmoqda",
      en: "Xbox's big reset cuts 3,200 jobs",
    },
  },
  {
    id: 91801,
    shift: 14,
    image:
      "https://cdn1.wiro.ai/2b97ab18-2d87df57-83434db9-df0c4232-f6647792-4132135c-3f4c6319-f0cdcc47-a3a18d9a-c39b8747-c9170b62-cd76e63e/2337916_Image.png",
    title: {
      uz: "Agility Robotics bosh direktori Peggi Jonson SPAClar va apparat ustunliklari haqida",
      en: "Agility Robotics CEO Peggy Johnson on SPACs and hardware moats",
    },
  },
  {
    id: 91800,
    shift: -14,
    image:
      "https://cdn1.wiro.ai/0758c7f7-b1fb7e9d-b31248cd-7f304742-f2a80eb3-a14bd3f3-48d2e738-561d1299-c28afef7-3cefe011-8e3e6fb6-45448c4e/2337810_Image.png",
    title: {
      uz: "AI mehnatdan kapitalga siljishi Irlandiyaning texnologiya og‘ir soliq bazasiga tahdid solmoqda",
      en: "AI labor-to-capital shift threatens Ireland’s tech-heavy tax base",
    },
  },
  {
    id: 91799,
    shift: 7,
    image:
      "https://cdn1.wiro.ai/c5563a6a-eabcf8ac-bd199571-30ebe417-5e62a1bf-66455782-f76ba9bc-c3cf7c7a-90d444fd-6a8d78f0-f856a1a3-ba785a35/2337679_Image.png",
    title: {
      uz: "AQSh G‘aznachiligi AI bozoridagi xavflar dotcom qulashini eslatdi",
      en: "US Treasury warns AI market risks echo dotcom crash",
    },
  },
  {
    id: 91798,
    shift: -21,
    image:
      "https://cdn1.wiro.ai/ecdaf7dc-21467c72-3b324a8b-38aaf8a5-dee6e18b-0be8657a-fa727095-3f2235d6-fc3a909e-b2e6effb-0d801de8-79dc9949/2337525_Image.png",
    title: {
      uz: "Claude Opus 4.8 va Sonnet 5 tool-calling samaradorligida pasaydi",
      en: "Claude Opus 4.8 and Sonnet 5 regress on tool-calling performance",
    },
  },
  {
    id: 91797,
    shift: 0,
    image: fallbackLogoImage,
    title: {
      uz: "Nvidia Kyber NVL144 ni 2028 yilga kechiktirdi va NVL72x2 ni bekor qildi",
      en: "Nvidia delays Kyber NVL144 to 2028 and scraps NVL72x2",
    },
  },
  {
    id: 91796,
    shift: 21,
    image:
      "https://cdn1.wiro.ai/d95e93a4-e0b4417a-c35960df-22479007-2bfff055-d85105c4-efc17e8a-ee84da82-acdf1e2e-9afa08a1-0ade5a45-03ffd3c6/2337069_Image.png",
    title: {
      uz: "Dunyoning ilk o‘zini moslashtiruvchi agentli ransomware JadePuffer",
      en: "Meet JadePuffer, the world’s first self-adapting agentic ransomware",
    },
  },
];

const homeOlderStories = [
  {
    id: 91795,
    shift: -10,
    image:
      "https://cdn1.wiro.ai/2b97ab18-2d87df57-83434db9-df0c4232-f6647792-4132135c-3f4c6319-f0cdcc47-a3a18d9a-c39b8747-c9170b62-cd76e63e/2337916_Image.png",
    title: {
      uz: "OpenAI agent vositalari uchun strukturali chaqiruvlarni yanada qattiqroq sinamoqda",
      en: "OpenAI tightens agent tool workflows as structured calls matter more",
    },
  },
  {
    id: 91794,
    shift: 12,
    image: fallbackLogoImage,
    title: {
      uz: "Meta va Apple ilovalar ichida chuqurroq AI xulosa qatlamlarini sinamoqda",
      en: "Meta and Apple keep testing deeper AI summary layers inside apps",
    },
  },
];

const homeSignalStories = [
  {
    id: 91805,
    shift: 0,
    image:
      "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1400&q=80",
    score: 94,
    source: "CBS News",
    time: { uz: "19:01", en: "19:01", tr: "19:01" },
    url: "https://www.cbsnews.com/chicago/news/pritzker-to-sign-illinois-bill-aimed-artificial-intelligence-accountability/",
    category: "policy",
    title: {
      uz: "Illinois OpenAI va Anthropic qo'llab-quvvatlagan AI xavfsizlik qonunini imzoladi",
      en: "Illinois signs AI safety bill backed by OpenAI and Anthropic",
      tr: "Illinois, OpenAI ve Anthropic'in destekledi\u011fi AI g\u00fcvenli\u011fi yasas\u0131n\u0131 imzalad\u0131",
    },
    summary: {
      uz: [
        "Illinois gubernatori JB Pritzker sun'iy intellekt uchun hisobdorlik va xavfsizlik doirasini belgilovchi 315-sonli Senat qonunini imzoladi.",
        "Qonun yirik model ishlab chiquvchilardan xavflarni kamaytirish uchun shaffoflik jadvali, qat'iy xavfsizlik protokollari va uchinchi tomon auditorlarini talab qiladi.",
      ],
      en: [
        "Illinois Gov. JB Pritzker signed Senate Bill 315, creating a framework for AI accountability and safety.",
        "The law requires large model developers to publish transparency frameworks, adopt strict safety protocols, and use third-party auditors.",
      ],
      tr: [
        "Illinois Valisi JB Pritzker, yapay zek\u00e2da hesap verebilirlik ve g\u00fcvenlik \u00e7er\u00e7evesi olu\u015fturan 315 say\u0131l\u0131 Senato tasar\u0131s\u0131n\u0131 imzalad\u0131.",
        "Yasa, b\u00fcy\u00fck model geli\u015ftiricilerinin \u015feffafl\u0131k \u00e7er\u00e7eveleri yay\u0131mlamas\u0131n\u0131, s\u0131k\u0131 g\u00fcvenlik protokolleri uygulamas\u0131n\u0131 ve ba\u011f\u0131ms\u0131z denet\u00e7ilerle \u00e7al\u0131\u015fmas\u0131n\u0131 zorunlu k\u0131l\u0131yor.",
      ],
    },
  },
  {
    id: 91804,
    shift: 0,
    image:
      "https://cdn1.wiro.ai/a6d0665b-c73b6c09-73c55090-9fa45d58-aa1af09d-783dc88f-0927cad6-e09e634b-ba981037-f603826b-3a6e62fb-7f1407ca/2338777_Image.png",
    score: 94,
    source: "Andrew Webster / The Verge",
    time: { uz: "10:35 AM", en: "10:35 AM", tr: "10:35" },
    url: "https://www.theverge.com/games/961632/nintendo-switch-europe-discontinued",
    category: "policy",
    title: {
      uz: "Nintendo batareya qonunlari sabab Yevropadagi Switch savdosini 2027 yilgacha to'xtatadi",
      en: "Nintendo Ending European Switch Sales by 2027 Over Battery Laws",
      tr: "Nintendo, batarya kurallar\u0131 nedeniyle Avrupa'da Switch sat\u0131\u015f\u0131n\u0131 2027'de bitirecek",
    },
    summary: {
      uz: [
        "Nintendo 2027 yil fevral o'rtalaridan boshlab Yevropada original Switch oilasining sotuvini to'xtatadi.",
        "Qaror almashtiriladigan batareyalar bo'yicha yangi YI talablariga moslashish uchun qabul qilindi.",
      ],
      en: [
        "Nintendo will stop selling the original Switch family in Europe by mid-February 2027.",
        "The move is tied to new EU rules that require handheld devices to use replaceable batteries.",
      ],
      tr: [
        "Nintendo, \u015eubat 2027 ortas\u0131ndan itibaren Avrupa'da orijinal Switch ailesinin sat\u0131\u015f\u0131n\u0131 durduracak.",
        "Karar, ta\u015f\u0131nabilir cihazlarda de\u011fi\u015ftirilebilir batarya zorunlulu\u011fu getiren yeni AB kurallar\u0131yla ba\u011flant\u0131l\u0131.",
      ],
    },
  },
  {
    id: 91803,
    shift: 21,
    image:
      "https://cdn1.wiro.ai/a6d0665b-c73b6c09-73c55090-9fa45d58-08a5f804-071a656b-ff5bf5e3-9284e84c-77407ef8-3e37dc86-77078015-979370db/2338743_Image.png",
    score: 94,
    source: "James Hunt / The Block",
    time: { uz: "10:25 AM", en: "10:25 AM", tr: "10:25" },
    url: "https://www.theblock.co/post/407217/strategy-bitcoin-digital-energy",
    category: "companies",
    title: {
      uz: "MicroStrategy 11,4 milliard dollarlik qog'oz zarar fonida 216 million dollarlik Bitcoin sotdi",
      en: "MicroStrategy sells $216M in Bitcoin amid $11.4B paper loss",
      tr: "MicroStrategy, 11,4 milyar dolarl\u0131k ger\u00e7ekle\u015fmemi\u015f zarara ra\u011fmen 216 milyon dolarl\u0131k Bitcoin satt\u0131",
    },
    summary: {
      uz: [
        "MicroStrategy imtiyozli aksiyalar taqsimotini moliyalash uchun taxminan 216 million dollarlik 3 588 BTC sotdi.",
        "Shunga qaramay, kompaniya 843 775 BTC ushlab turibdi va qog'ozdagi zarari taxminan 11,4 milliard dollarni tashkil etadi.",
      ],
      en: [
        "MicroStrategy sold 3,588 BTC for about $216 million as it manages preferred stock distributions and reserve needs.",
        "The company still holds 843,775 BTC and faces roughly $11.4 billion in paper losses.",
      ],
      tr: [
        "MicroStrategy, imtiyazl\u0131 hisse da\u011f\u0131t\u0131mlar\u0131n\u0131 ve rezerv ihtiya\u00e7lar\u0131n\u0131 y\u00f6netmek i\u00e7in yakla\u015f\u0131k 216 milyon dolar de\u011ferinde 3.588 BTC satt\u0131.",
        "\u015eirket h\u00e2l\u00e2 843.775 BTC tutuyor ve yakla\u015f\u0131k 11,4 milyar dolarl\u0131k ger\u00e7ekle\u015fmemi\u015f zararla kar\u015f\u0131 kar\u015f\u0131ya.",
      ],
    },
  },
  {
    id: 91802,
    shift: -7,
    image:
      "https://cdn1.wiro.ai/22680191-31ed99e6-1ebd7af6-27f8f142-fb91ab86-b27df2b0-f69e80b0-aa89f934-28ff8bf5-005bd550-4e3ca625-2c051cdd/2338588_Image.png",
    score: 95,
    source: "Bloomberg",
    time: { uz: "9:41 AM", en: "9:41 AM", tr: "09:41" },
    url: "https://www.bloomberg.com/news/articles/2026-07-06/microsoft-s-xbox-to-cut-3-200-jobs-divest-five-studios-in-major-overhaul",
    category: "gaming",
    title: {
      uz: "Xbox 3 200 ish o'rnini qisqartirdi va Ninja Theory'ni ajratdi",
      en: "Xbox cuts 3,200 jobs and divests Ninja Theory in major reset",
      tr: "Xbox, b\u00fcy\u00fck yeniden yap\u0131lanmada 3.200 ki\u015fiyi i\u015ften \u00e7\u0131kar\u0131p Ninja Theory'yi elden \u00e7\u0131kar\u0131yor",
    },
    summary: {
      uz: [
        "Microsoft'ning Xbox bo'limi qariyb 3 200 ish o'rnini qisqartirish va besh studiyani ajratishni rejalashtirmoqda.",
        "Bu qayta sozlash kompaniyaning asosiy seriyalar va obuna xizmatlariga tayanuvchi yalroq o'yin strategiyasiga o'tishini ko'rsatadi.",
      ],
      en: [
        "Microsoft's Xbox division is cutting about 3,200 jobs and divesting five studios, including Ninja Theory.",
        "The reset points to a leaner gaming strategy centered on key franchises and subscriptions.",
      ],
      tr: [
        "Microsoft'un Xbox birimi, Ninja Theory dahil be\u015f st\u00fdyoyu elden \u00e7\u0131kar\u0131rken yakla\u015f\u0131k 3.200 ki\u015fiyi i\u015ften \u00e7\u0131kar\u0131yor.",
        "Yeniden yap\u0131lanma, temel seriler ve aboneliklere odaklanan daha yal\u0131n bir oyun stratejisine i\u015faret ediyor.",
      ],
    },
  },
  {
    id: 91801,
    shift: 14,
    image:
      "https://cdn1.wiro.ai/2b97ab18-2d87df57-83434db9-df0c4232-f6647792-4132135c-3f4c6319-f0cdcc47-a3a18d9a-c39b8747-c9170b62-cd76e63e/2337916_Image.png",
    score: 94,
    source: "Connie Loizos / TechCrunch",
    time: { uz: "6:55 AM", en: "6:55 AM", tr: "06:55" },
    url: "https://techcrunch.com/2026/07/05/this-humanoid-robotics-company-is-going-public-but-its-ceo-isnt-promising-a-robot-in-your-home-anytime-soon/",
    category: "funding",
    title: {
      uz: "Agility Robotics bosh direktori Peggy Johnson SPAClar va apparat ustunliklari haqida",
      en: "Agility Robotics CEO Peggy Johnson on SPACs and hardware moats",
      tr: "Agility Robotics CEO'su Peggy Johnson, SPAC'ler ve donan\u0131m avantaj\u0131n\u0131 anlatt\u0131",
    },
    summary: {
      uz: [
        "Agility Robotics Churchill Capital Corp XI bilan birlashib ommaga chiqishni rejalashtirmoqda va kompaniya taxminan 2,5 milliard dollar baholanmoqda.",
        "Peggy Johnson haqiqiy ustunlik zavodga joylashgan robotlar, xavfsizlik ma'lumotlari va real dunyo tajribasidan kelishini aytmoqda.",
      ],
      en: [
        "Agility Robotics plans to go public through a SPAC merger, valuing the company at about $2.5 billion.",
        "Peggy Johnson says the real hardware moat comes from industrial safety data and factory deployment, not demos.",
      ],
      tr: [
        "Agility Robotics, \u015firkete yakla\u015f\u0131k 2,5 milyar dolar de\u011fer bi\u00e7en bir SPAC birle\u015fmesiyle halka a\u00e7\u0131lmay\u0131 planl\u0131yor.",
        "Peggy Johnson'a g\u00f6re as\u0131l donan\u0131m avantaj\u0131 g\u00f6sterilerden de\u011fil, end\u00fcstriyel g\u00fcvenlik verileri ve fabrika uygulamalar\u0131ndan geliyor.",
      ],
    },
  },
  {
    id: 91800,
    shift: -14,
    image:
      "https://cdn1.wiro.ai/0758c7f7-b1fb7e9d-b31248cd-7f304742-f2a80eb3-a14bd3f3-48d2e738-561d1299-c28afef7-3cefe011-8e3e6fb6-45448c4e/2337810_Image.png",
    score: 94,
    source: "Olivia Fletcher / Bloomberg",
    time: { uz: "6:40 AM", en: "6:40 AM", tr: "06:40" },
    url: "https://www.bloomberg.com/news/articles/2026-07-06/meta-tiktok-jobs-cuts-in-ireland-augur-further-ai-disruption",
    category: "policy",
    title: {
      uz: "AI mehnatdan kapitalga siljishi Irlandiyaning texnologiyaga og'ir soliq bazasiga tahdid solmoqda",
      en: "AI labor-to-capital shift threatens Ireland's tech-heavy tax base",
      tr: "AI'\u0131n emekten sermayeye kay\u0131\u015f\u0131, \u0130rlanda'n\u0131n teknoloji a\u011f\u0131rl\u0131kl\u0131 vergi taban\u0131n\u0131 tehdit ediyor",
    },
    summary: {
      uz: [
        "Meta, TikTok va boshqa yirik texnologik kompaniyalardagi qisqartirishlar AI Irlandiya raqamli iqtisodiyotini qanday o'zgartirayotganini ko'rsatmoqda.",
        "Mehnatga asoslangan modellardan kapitalga asoslangan modellarga o'tish yuqori daromadli texnologiya xodimlariga tayangan soliq bazasini zaiflashtirishi mumkin.",
      ],
      en: [
        "Layoffs at Meta, TikTok, and other tech firms show how AI is shifting Ireland's digital economy away from labor-heavy operations.",
        "That could weaken the tax base long supported by high-income tech workers.",
      ],
      tr: [
        "Meta, TikTok ve di\u011fer teknoloji \u015firketlerindeki i\u015ften \u00e7\u0131karmalar, AI'\u0131n \u0130rlanda'n\u0131n dijital ekonomisini emek yo\u011fun faaliyetlerden uzakla\u015ft\u0131rd\u0131\u011f\u0131n\u0131 g\u00f6steriyor.",
        "Bu de\u011fi\u015fim, uzun s\u00fcredir y\u00fcksek gelirli teknoloji \u00e7al\u0131\u015fanlar\u0131na dayanan vergi taban\u0131n\u0131 zay\u0131flatabilir.",
      ],
    },
  },
  {
    id: 91799,
    shift: 7,
    image:
      "https://cdn1.wiro.ai/c5563a6a-eabcf8ac-bd199571-30ebe417-5e62a1bf-66455782-f76ba9bc-c3cf7c7a-90d444fd-6a8d78f0-f856a1a3-ba785a35/2337679_Image.png",
    score: 94,
    source: "Eric Katz / NOTUS",
    time: { uz: "5:30 AM", en: "5:30 AM", tr: "05:30" },
    url: "https://www.notus.org/economy/treasury-internal-report-warning-dangers-ai-bubble",
    category: "policy",
    title: {
      uz: "AQSh G'aznachiligi AI bozoridagi xavflar dotcom qulashini eslatishini ogohlantirdi",
      en: "US Treasury warns AI market risks echo dotcom crash",
      tr: "ABD Hazinesi, AI piyasas\u0131ndaki risklerin dot-com \u00e7\u00f6k\u00fc\u015f\u00fcn\u00fc and\u0131rd\u0131\u011f\u0131 konusunda uyard\u0131",
    },
    summary: {
      uz: [
        "Ichki G'aznachilik ogohlantiruvi AI bozoridagi xavflar dotcom pufagiga o'xshab borayotganini aytadi.",
        "Xavotir shundaki, baholashlar va shov-shuv asosiy ko'rsatkichlardan oldinga chiqib ketmoqda.",
      ],
      en: [
        "An internal Treasury warning says AI market risks are starting to look like the dot-com bubble.",
        "The concern is that valuations and hype may be running ahead of fundamentals.",
      ],
      tr: [
        "ABD Hazinesi'nin \u015firket i\u00e7i uyar\u0131s\u0131, AI piyasas\u0131ndaki risklerin dot-com balonuna benzemeye ba\u015flad\u0131\u011f\u0131n\u0131 s\u00f6yl\u00fcyor.",
        "Kayg\u0131, de\u011ferlemelerin ve abart\u0131n\u0131n temel g\u00f6stergelerin \u00f6n\u00fcne ge\u00e7mesi.",
      ],
    },
  },
  {
    id: 91798,
    shift: -21,
    image:
      "https://cdn1.wiro.ai/ecdaf7dc-21467c72-3b324a8b-38aaf8a5-dee6e18b-0be8657a-fa727095-3f2235d6-fc3a909e-b2e6effb-0d801de8-79dc9949/2337525_Image.png",
    score: 94,
    source: "Armin Ronacher / Armin Ronacher's Thoughts and Writings",
    time: { uz: "4:35 AM", en: "4:35 AM", tr: "04:35" },
    url: "https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/",
    category: "ai",
    title: {
      uz: "Claude Opus 4.8 va Sonnet 5 vosita chaqirish samaradorligida pasaydi",
      en: "Claude Opus 4.8 and Sonnet 5 regress on tool-calling performance",
      tr: "Claude Opus 4.8 ve Sonnet 5'in ara\u00e7 \u00e7a\u011f\u0131rma performans\u0131 geriledi",
    },
    summary: {
      uz: [
        "So'nggi sinovlar Anthropic'ning yangi modellari vosita chaqirishda unchalik ishonchli emasligini ko'rsatmoqda.",
        "Bu uchinchi tomon agent ish oqimlarida tekshirish muammolarini keltirib chiqaradi.",
      ],
      en: [
        "Recent tests suggest Anthropic's newest models are less reliable at tool calling, even when the reasoning is sound.",
        "That creates validation problems for third-party agent workflows.",
      ],
      tr: [
        "Son testler, Anthropic'in en yeni modellerinin ak\u0131l y\u00fcr\u00fctmeleri sa\u011flam olsa bile ara\u00e7 \u00e7a\u011f\u0131rmada daha az g\u00fcvenilir oldu\u011funu g\u00f6steriyor.",
        "Bu durum, \u00fc\u00e7\u00fcnc\u00fc taraf ajan i\u015f ak\u0131\u015flar\u0131nda do\u011frulama sorunlar\u0131 yarat\u0131yor.",
      ],
    },
  },
  {
    id: 91797,
    shift: 0,
    image: fallbackLogoImage,
    score: 94,
    source: "Anniek Bao / CNBC",
    time: { uz: "1:35 AM", en: "1:35 AM", tr: "01:35" },
    url: "https://www.cnbc.com/2026/07/06/nvidia-kyber-rack-system-delays-manufacturing-taiwan-rubin-chips-.html",
    category: "products",
    title: {
      uz: "Nvidia Kyber NVL144 ni 2028 yilga kechiktirdi va NVL72x2 ni bekor qildi",
      en: "Nvidia delays Kyber NVL144 to 2028 and scraps NVL72x2",
      tr: "Nvidia, Kyber NVL144'\u00fc 2028'e erteledi ve NVL72x2'yi iptal etti",
    },
    summary: {
      uz: [
        "Nvidia Kyber NVL144 ni 2028 yilga qoldirdi va zaxira NVL72x2 dizaynidan voz kechdi.",
        "Ishlab chiqarishdagi muammolar va bulut mijozlarining qarshiligi rack-scale rejasini sekinlashtirmoqda.",
      ],
      en: [
        "Nvidia has delayed Kyber NVL144 to 2028 and scrapped its NVL72x2 backup design.",
        "Manufacturing issues and cloud-provider pushback are slowing the rack-scale roadmap.",
      ],
      tr: [
        "Nvidia, Kyber NVL144'\u00fc 2028'e erteledi ve yedek NVL72x2 tasar\u0131m\u0131ndan vazge\u00e7ti.",
        "\u00dcretim sorunlar\u0131 ve bulut sa\u011flay\u0131c\u0131lar\u0131n\u0131n itirazlar\u0131, raf \u00f6l\u00e7ekli yol haritas\u0131n\u0131 yava\u015flat\u0131yor.",
      ],
    },
  },
  {
    id: 91796,
    shift: 21,
    image:
      "https://cdn1.wiro.ai/d95e93a4-e0b4417a-c35960df-22479007-2bfff055-d85105c4-efc17e8a-ee84da82-acdf1e2e-9afa08a1-0ade5a45-03ffd3c6/2337069_Image.png",
    score: 95,
    source: "Bill Toulas / BleepingComputer",
    time: { uz: "12:15 AM", en: "12:15 AM", tr: "00:15" },
    url: "https://www.bleepingcomputer.com/news/security/jadepuffer-ransomware-used-ai-agent-to-automate-entire-attack/",
    category: "security",
    title: {
      uz: "Dunyoning ilk o'zini moslashtiruvchi agentli ransomware JadePuffer bilan tanishing",
      en: "Meet JadePuffer, the world's first self-adapting agentic ransomware",
      tr: "D\u00fcnyan\u0131n ilk kendini uyarlayan ajan tabanl\u0131 fidye yaz\u0131l\u0131m\u0131 JadePuffer ile tan\u0131\u015f\u0131n",
    },
    summary: {
      uz: [
        "Tadqiqotchilar JadePuffer'ni to'liq avtonom AI agent boshqargan birinchi hujjatlashtirilgan ransomware operatsiyasi deb atashmoqda.",
        "Zararli dastur razvedka, kirish ma'lumotlarini o'g'irlash va shifrlashni real vaqtda moslashgan holda avtomatlashtiradi.",
      ],
      en: [
        "Researchers say JadePuffer is the first documented ransomware run by an autonomous AI agent.",
        "The malware automates reconnaissance, credential theft, and encryption while adapting in real time.",
      ],
      tr: [
        "Ara\u015ft\u0131rmac\u0131lar, JadePuffer'\u0131n otonom bir AI ajan\u0131 taraf\u0131ndan y\u00f6netilen ilk belgelenmi\u015f fidye yaz\u0131l\u0131m\u0131 oldu\u011funu s\u00f6yl\u00fcyor.",
        "Zararl\u0131 yaz\u0131l\u0131m ke\u015fif, kimlik bilgisi h\u0131rs\u0131zl\u0131\u011f\u0131 ve \u015fifrelemeyi ger\u00e7ek zamanl\u0131 uyum sa\u011flayarak otomatikle\u015ftiriyor.",
      ],
    },
  },
];

const homeSignalOlderStories = [
  {
    id: 91795,
    shift: -10,
    image:
      "https://cdn1.wiro.ai/2b97ab18-2d87df57-83434db9-df0c4232-f6647792-4132135c-3f4c6319-f0cdcc47-a3a18d9a-c39b8747-c9170b62-cd76e63e/2337916_Image.png",
    score: 93,
    source: "OpenAI",
    time: { uz: "Bugun ertaroq", en: "Earlier today", tr: "Bug\u00fcn erken saatlerde" },
    url: "https://openai.com",
    category: "ai",
    title: {
      uz: "OpenAI agent vositalari uchun strukturali chaqiruvlarni yanada qattiqroq sinamoqda",
      en: "OpenAI tightens agent tool workflows as structured calls matter more",
      tr: "OpenAI, yap\u0131land\u0131r\u0131lm\u0131\u015f \u00e7a\u011fr\u0131lar \u00f6nem kazand\u0131k\u00e7a ajan ara\u00e7lar\u0131n\u0131n i\u015f ak\u0131\u015f\u0131n\u0131 s\u0131k\u0131la\u015ft\u0131r\u0131yor",
    },
    summary: {
      uz: [
        "OpenAI agent vositalarini yanada qat'iy strukturali chaqiruvlarga yo'naltirmoqda, chunki ishonchlilik tobora muhimlashmoqda.",
        "Bu o'zgarish erkin shakldagi chaqiruvlar o'rniga schema-ga xavfsiz ish oqimlariga o'tish tendensiyasini ko'rsatadi.",
      ],
      en: [
        "OpenAI is pushing agent tools toward stricter structured calls as reliability matters more.",
        "The change reflects a wider move toward schema-safe workflows over loose, free-form tool use.",
      ],
      tr: [
        "OpenAI, g\u00fcvenilirlik daha \u00f6nemli h\u00e2le geldik\u00e7e ajan ara\u00e7lar\u0131n\u0131 daha kat\u0131 yap\u0131land\u0131r\u0131lm\u0131\u015f \u00e7a\u011fr\u0131lara y\u00f6neltiyor.",
        "Bu de\u011fi\u015fim, serbest bi\u00e7imli ara\u00e7 kullan\u0131m\u0131ndan \u015femaya uygun i\u015f ak\u0131\u015flar\u0131na do\u011fru daha geni\u015f bir ge\u00e7i\u015fi yans\u0131t\u0131yor.",
      ],
    },
  },
  {
    id: 91794,
    shift: 12,
    image: fallbackLogoImage,
    score: 93,
    source: "Meta / Apple",
    time: { uz: "Bugun ertaroq", en: "Earlier today", tr: "Bug\u00fcn erken saatlerde" },
    url: "https://www.apple.com/newsroom/",
    category: "ai",
    title: {
      uz: "Meta va Apple ilovalar ichida chuqurroq AI xulosa qatlamlarini sinamoqda",
      en: "Meta and Apple keep testing deeper AI summary layers inside apps",
      tr: "Meta ve Apple, uygulamalarda daha derin AI \u00f6zet katmanlar\u0131n\u0131 test etmeyi s\u00fcrd\u00fcr\u00fcyor",
    },
    summary: {
      uz: [
        "Meta va Apple ilovalar ichida chuqurroq AI xulosa qatlamlarini sinashda davom etmoqda.",
        "Ikkala kompaniya ham ilova ichidagi xulosalar uzoq o'qish oqimlarini qanchalik almashtira olishini o'rganmoqda.",
      ],
      en: [
        "Meta and Apple are still testing deeper AI summary layers inside their apps.",
        "Both companies are exploring how far on-device or in-app summaries can replace longer reading flows.",
      ],
      tr: [
        "Meta ve Apple, uygulamalar\u0131nda daha derin AI \u00f6zet katmanlar\u0131n\u0131 test etmeyi s\u00fcrd\u00fcr\u00fcyor.",
        "Her iki \u015firket de cihaz veya uygulama i\u00e7i \u00f6zetlerin uzun okuma ak\u0131\u015flar\u0131n\u0131n ne kadar\u0131n\u0131n yerini alabilece\u011fini ara\u015ft\u0131r\u0131yor.",
      ],
    },
  },
];

const locales = {
  uz: {
    htmlLang: "uz",
    localeLabel: "O‘z",
    localeName: "O‘zbekcha",
    switchLabel: "EN",
    nav: {
      about: "Haqida",
      library: "Kutubhona",
      relay: "Relay",
      contact: "Aloqa",
      sponsor: "Homiylik",
      lineup: "Lineup",
      privacy: "Maxfiylik",
    },
    ui: {
      language: "Til",
      skipLink: "Kontentga o‘tish",
      follow: "Kuzatish",
      explore: "Kashf et",
      palette: "Rang tanla",
      today: "Bugun",
      loading: "Xronologiya yuklanmoqda",
      preparing: "Birinchi signallar tayyorlanmoqda.",
      brandQuestion: ".alomat, siz qayerda edingiz?",
      timeline: ".alomat signal vaqt jadvali",
      timelineBrand: "SIGNAL VAQT JADVALI",
      activeSignal: "Faol signal",
      sourceLabel: "Manba",
      timeLabel: "Vaqt",
      weightLabel: "Dolzarbligi",
      audioBrief: "Audio qisqa",
      aiLens: "AI linzasi",
      askAi: "AI so'rash",
      originalSource: "Asl manba",
      signalCount: "10 signal",
      topbarToday: "Bugungi chiziq",
      thresholdLabel: "Eshik",
      heroTitle: "Xush kelibsiz, begona.",
      heroBody: "Qator sizni nima deb atasin? Ismingizni qoldiring.",
      namePlaceholder: "siz@example.com",
      nameButton: "Ism kiriting",
      nameHint:
        "Saqlashlar, yoqtirishlar va kutubxona birga sinxron bo'lishi uchun ism qoldiring.",
      authKicker: "01 - Shaxsiy xotira",
      authTitle: "Signallaringizni saqlang.",
      authBody: "Saqlagan va yoqtirgan signallaringiz .alomat hisobingizda tursin.",
      authEmail: "E-pochta",
      authFirstName: "Ism",
      authLastName: "Familiya",
      authCode: "Tasdiqlash kodi",
      authSubmit: "Mailni saqlash",
      authNameSubmit: "Ismni saqlash",
      close: "Yopish",
      loadEarlier: "Oldingi kunlarni yuklash",
      loadedEarlier: "Oldingi kunlar ochildi",
      noMore: "Bugungi signallar tugadi",
      manifesto: "MANIFESTO",
      manifestoTitle: ".alomat — siz qayerda edingiz?",
      manifestoLead:
        "Bu yangilik sayti emas. Bu editorial signal qatlami. Shovqin iqtisodiga qarshi aniq bir pozitsiya.",
      manifestoLead2:
        "Ko‘proq o‘qiydigan joy emas — tezroq tushunadigan joy.",
      readManifesto: "Manifestoni o‘qish →",
      downloadApp: "Ilovani ko'rish",
      footer: "made with ♥ in O‘zbekiston",
      backHome: "Ana sahifa",
      pageIntro: "Qisqa, aniq, tahrirlangan.",
    },
    home: {
      timeline: homeSignalStories,
      older: homeSignalOlderStories,
    },
    about: {
      preface: "Bu biz haqimizdagi sahifa emas.",
      title: "Bu — manifest.",
      kicker: "Diqqat bilan kuzat. Mohiyatni aniq bil.",
      intro:
        ".alomat yangiliklar sayti emas. Shunchaki ilova ham emas. Aniqrog‘i, .alomat — avvalo pozitsiya. Internetning cheksizligiga qarshi qo‘yilgan chegara. Shovqin iqtisodiga javob.",
      sections: [
        {
          num: "01",
          title: "Internet cheksiz. Diqqat emas.",
          paragraphs: [
            "Ellikta sahifa ochamiz-u, birortasini oxirigacha o‘qimaymiz. Bir sarlavhaga sakkiz soniya ajratamiz. Kontekst yo‘q, tartib yo‘q, esda qoladigan narsa yo‘q. Biz buni shovqin iqtisodi deymiz va uning bir qismi bo‘lishni rad etamiz.",
          ],
        },
        {
          num: "02",
          title: "Nima ekanimizni tushuntirish uchun avval nima emasligimizni aytishimiz kerak.",
          paragraphs: [
            "Biz yangilik ilovasi emasmiz.",
            "Biz AI vositasi emasmiz.",
            "Biz cheksiz yangiliklar lentasi emasmiz.",
            "Biz hamma narsa emasmiz.",
            "Biz tahririy signal qatlamimiz.",
            "Biz aniqlik mahsulotimiz.",
            "Biz sizning kunlik brifingingizmiz.",
            "Biz texnologiya va uning atrofidagi madaniyatni kuzatamiz.",
          ],
        },
        {
          num: "03",
          title: "Bizning vazifamiz ko‘proq kontent ishlab chiqarish emas.",
          paragraphs: [
            "Bizning vazifamiz kun shovqinini saralab, eng muhim signallarni oldinga chiqarish. Bitta karta, bitta signal. Bitta asosiy fikr, qisqa xulosa, bitta manba va bitta amal. Hammasi shu. Bundan kami yetarli emas, ortig‘i esa shovqin.",
          ],
        },
        {
          num: "04",
          title: "Qoidalarimiz aniq.",
          bullets: ["Reklama yo‘q.", "Ma'lumot sotilmaydi.", "O‘quvchidan bir tiyin ham olinmaydi — abadiy."],
          paragraphs: ["O‘quvchi mahsulot emas. Mahsulot o‘quvchi uchun yaratiladi."],
        },
        {
          num: "05",
          title: "Bu yangiliklar lentasi emas. Bu kundalik odat.",
          paragraphs: [
            "Ertalab oching va kunning manzarasini ko‘ring. Kun o‘rtasida bitta signalni o‘qing, so‘ng hayotingizga qayting. Kechqurun nima o‘zgarganini tekshiring. .alomat shunchaki ochib qo‘yiladigan ilova emas — qaytib kelinadigan makon. Sizning makoningiz.",
          ],
        },
        {
          num: "06",
          title: "Biz bir kishilik studiyamiz.",
          paragraphs: [
            "Oktay tizimning har bir texnik satrini yozadi va qaysi signal e’lon qilinishini ham o‘zi tanlaydi. Reklama agentligi ham, o‘sish jamoasi ham, mahsulot strategisti ham yo‘q. Qaror ham, xato ham, ohang ham o‘zimizniki.",
          ],
        },
      ],
      closingTitle: ".alomat ko‘proq o‘qiydigan joy emas.",
      closingBody: "Tezroq tushunadigan joy.",
      signature: "— Oktay",
      studio: ".alomat · yolg‘iz studiya",
    },
    library: {
      title: "Kutubhona",
      lead:
        "Saqlangan signallar, yoqtirilgan hikoyalar va shaxsiy ro‘yxatlar bitta tartiblangan joyda.",
      stats: [
        { label: "Saqlangan", value: "128" },
        { label: "Yoqtirilgan", value: "42" },
        { label: "To‘plamlar", value: "9" },
      ],
      collections: [
        {
          title: "Bugun saqlangan",
          summary: "Eng so‘nggi signallar bir qarashda.",
        },
        {
          title: "Qaytib o‘qiladiganlar",
          summary: "Uzunroq o‘qish uchun belgilangan hikoyalar.",
        },
        {
          title: "O‘zim uchun",
          summary: "Shaxsiy, sokin va kam shovqinli ro‘yxatlar.",
        },
      ],
      highlights: [
        {
          title: "Shaxsiy signallar",
          summary:
            "Sizga kerak bo‘lgan hikoyalar, kategoriyalar va qayta ko‘rish uchun saqlangan kartalar.",
        },
        {
          title: "Xotira rejimi",
          summary:
            "Qayerda to‘xtaganingizni unutmang. O‘qilgan, yoqtirilgan va saqlangan holat birga yuradi.",
        },
        {
          title: "Bir qarashda",
          summary:
            "Sarlavha, qisqa izoh va manbani bir qatorda ko‘rsatadigan pok ko‘rinish.",
        },
      ],
      ctaTitle: "Kutubxonani yig‘ish uchun kirish kerak emas.",
      ctaBody:
        "Biroq ism qoldirsangiz, saqlash va yoqtirishlar bir joyda yuradi.",
      ctaAction: "Ism qoldirish",
    },
    relay: {
      title: "Relay",
      lead:
        "Qisqa xabarnomalar va ritmik yangilanishlar uchun signal uzatish qatlami.",
      cards: [
        {
          title: "Tonggi qisqa sharh",
          summary:
            "Tongdagi uchta signal. Qisqa, sokin va kunni boshlashga yetarli.",
        },
        {
          title: "Kunduzgi kuzatuv",
          summary:
            "Kunning o‘rtasida sodir bo‘lgan muhim burilishlarni qayta tartiblaydi.",
        },
        {
          title: "Kechki yakun",
          summary:
            "Kechki yakun. Nima o‘zgardi, nima ahamiyatli bo‘ldi, nima ertaga qaytadi.",
        },
      ],
      features: [
        "Yuqori signal zichligi",
        "Qisqa o‘qish vaqti",
        "Qayta yuborish uchun tayyor bloklar",
      ],
      note:
        "Relay — bu kun bo‘ylab o‘tadigan signalni sekinlashtirmasdan, lekin yo‘qotmasdan yetkazish usuli.",
    },
    contact: {
      title: "Bir signal yuboring.",
      lead:
        "Hikoya taklif qiling, satr orasini so‘rang yoki ko‘zingizga tashlangan narsani ulashing. .alomat redaksiyasi kelgan har bir xabarni o‘qiydi.",
      primary: {
        label: "Signal",
        value: "signal@alomat.uz",
        note:
          "Xabar takliflari, qisqa izohlar, mavzu uchlari va o‘quvchi fikrlari uchun to‘g‘ridan-to‘g‘ri kanal.",
      },
      editor: {
        label: "Muharrir",
        value: "editor@alomat.uz",
        note: "Tahririy tuzatmalar, matbuot so‘rovlari va kontent fikrlari.",
      },
      sponsor: {
        label: "Homiylik",
        value: "sponsorship@alomat.uz",
        note: "Homiylik va hamkorlik bo‘yicha murojaatlar.",
      },
      socialTitle: "Kundalik muloqot",
      response: "Biz odatda 24 soat ichida qaytamiz.",
    },
    sponsor: {
      title: ".alomat'da joy oling.",
      lead:
        "Signal oqimi, byulleten va ilovada uch xil homiylik modeli bor. Hammasi kontent yonida turadi, o‘rnini egallamaydi va ochiq belgilanadi.",
      packages: [
        {
          name: "Sponsor nishoni",
          title: "Signal oqimida brendingiz nomi bilan ko‘rining.",
          description:
            "Habar kartalarida “Supported by [brand]” nishoni bilan ko‘rinadigan joy. Redaksiyaviy oqim buzilmaydi, o‘quvchi kim qo‘llab-quvvatlayotganini aniq ko‘radi.",
          rows: [
            ["Joylashuv", "Kunlik asosiy hikoya uchun joy, signal oqimining yuqori qismi"],
            ["Mazmun", "Brend nomi, ixtiyoriy qisqa shior va harakatga chaqiriq"],
            ["Belgilar", "Ochiq “Supported by” nishoni"],
          ],
        },
        {
          name: "Byulleten homiyligi",
          title: "Byulleten boshidagi ajratilgan joy.",
          description:
            "Signal byulletenimizdagi alohida bo‘lim. Bitta homiy, yuqori ko‘rinish; byulletenning boshida xulosalardan oldin turadigan aniq qo‘llab-quvvatlash qatlami.",
          rows: [
            ["Joylashuv", "Byulleten boshida alohida joy"],
            ["Mazmun", "Marka nomi, 1–2 jumla, CTA, ixtiyoriy rasm"],
            ["Belgilar", "“Sponsorli qo‘llab-quvvatlash” yorlig‘i"],
          ],
        },
        {
          name: "Advertorial",
          title: "Tahririy formatdagi brend hikoyasi.",
          description:
            ".alomat o‘quvchisi kutadigan toza va qisqa formatda yozilgan homiylik materiali. Siz taqdim etgan ma’lumotlar asosida tahririy mezonlarda tayyorlanadi; oddiy signal kabi o‘qiladi, ammo doimo “homiylik” yorlig‘i bilan beriladi.",
          rows: [
            ["Joylashuv", "Signal oqimida, oddiy xabarlar bilan bir formatda"],
            ["Mazmun", "Sarlavha, qisqa xulosa, ixtiyoriy audio va rasm"],
            ["Belgilar", "Ochiq “homiylik” yorlig‘i"],
          ],
        },
      ],
      note:
        "Paketlar va narxlar uchun sponsorship@alomat.uz ga yozing. Auditoriyangiz, maqsadingiz va qaysi model kerakligini qisqacha yuborsangiz, maxsus taklif bilan qaytamiz.",
    },
    lineup: {
      title: "Tanlangan yozuvlar",
      lead: "Yaxshi matn shoshmaydi.",
      featured: {
        title:
          "Sun’iy intellektdagi yangi temir parda: Fable 5 taqiqi kimni himoya qiladi?",
        summary:
          "AQShning Anthropic modellaridan foydalanishga qo‘ygan cheklovi milliy xavfsizlik bilan global kuchlar kurashi o‘rtasidagi nozik chegarani muhokamaga olib chiqmoqda.",
        author: "Shenol Dak",
        readTime: "5 daqiqa",
        date: "Bir kun oldin",
      },
      articles: [
        {
          title: "Internet endi ma’lumot bermaydi. U diqqatni yutadi.",
          author: "Oktay Dak",
          date: "2026-yil 13-may",
        },
      ],
      authors: [
        {
          initials: "OD",
          name: "Oktay Dak",
          role:
            "Internet shovqinidan ko‘ra undagi signallarga ko‘proq qiziqadi. Texnologiya, sun’iy intellekt va internet madaniyatidagi burilish nuqtalarini kuzatadi.",
        },
        {
          initials: "ShD",
          name: "Shenol Dak",
          role:
            "O‘qituvchi · AI bo‘yicha pedagog · Kraudfanding ma’lumotlari tahlilchisi · Generativ AI tizimlari · AI tadqiqotlari va tahlili",
        },
      ],
      cta: "Ariza yuborish",
      ctaNote: "Lineup safida muallif bo‘lishni istasangiz, ariza qoldiring — yakuniy qaror tahririyatniki.",
    },
    privacy: {
      title: "Ma’lumotlaringiz va biz",
      lead:
        "Nimani yig‘ishimiz, nima uchun yig‘ishimiz va sizning qo‘lingizda nimalar borligi.",
      closing:
        "Maxfiylik yoki ma'lumotlar bo‘yicha savollar uchun oktay.dak@icloud.com ga yozishingiz mumkin.",
      sections: [
        {
          title: "Asosiy tamoyil",
          paragraphs: [
            ".alomat minimal ma'lumot tamoyili bilan ishlaydi. Biz faqat xizmatni funksional qilish va tajribani yaxshilash uchun kerak bo'lgan ma'lumotlarni yig'amiz. Shaxsiy ma'lumotlaringizni uchinchi tomon bilan bo'lishmaymiz, sotmaymiz va reklama uchun ishlatmaymiz.",
          ],
        },
        {
          title: "Cookie'lar va kuzatuvchilar",
          paragraphs: [
            "Biz reklama cookie'si, uchinchi tomon kuzatuvchisi yoki saytlararo identifikatorlardan foydalanmaymiz. O‘z infratuzilmamizda joylashgan Umami analitikasi cookie qo‘ymaydi; u tashriflarni sizning IP manzilingiz va brauzer tanituvchisidan hosil qilingan, 24 soatda yangilanadigan anonim xesh orqali guruhlaydi.",
            "Analitika skripti faqat alomat.uz domenlarida ishlashga cheklangan; ko'chirilgan yoki uchinchi tomon saytlarida yuklanmaydi.",
            "Foydalanuvchi paneliga kirganda faqat zarur sessiya kukisi yaratiladi. U HttpOnly bo‘lib, sessiyangizni yopganingizda o‘chadi. Qurilmangizdagi mahalliy xotira faqat rang palitrasi, yopilgan bildirishnomalar va boshqa interfeys holatlari uchun ishlatiladi.",
          ],
          bullets: [
            "Reklama cookie'lari yo‘q",
            "Uchinchi tomon kuzatuvchilari yo‘q",
            "Faqat zarur sessiya cookie'si",
            "Mahalliy saqlash faqat interfeys uchun",
          ],
        },
        {
          title: "Biz yig‘adigan ma'lumotlar",
          paragraphs: [
            "Veb-saytimiz o‘z serverimizda joylashtirilgan Umami analitikasidan foydalanadi. Analitika sahifa ochilganda yuklanadi va faqat alomat.uz domenlari bilan cheklanadi.",
            "Umami orqali ko‘riladigan tizim ma'lumotlari: sahifa ko‘rishlar, brauzer turi, operatsion tizim, qurilma turi, mamlakat/mintaqa, ekran o‘lchami, yo‘naltiruvchi manzil va tashrif vaqti.",
          ],
        },
        {
          title: "Aloqa",
          paragraphs: [
            "Maxfiylik yoki ma'lumotlar bo‘yicha savollar uchun oktay.dak@icloud.com ga yozishingiz mumkin.",
          ],
        },
      ],
    },
  },
  en: {
    htmlLang: "en",
    localeLabel: "EN",
    localeName: "English",
    switchLabel: "UZ",
    nav: {
      about: "About",
      library: "Library",
      relay: "Relay",
      contact: "Contact",
      sponsor: "Sponsor",
      lineup: "Lineup",
      privacy: "Privacy",
    },
    ui: {
      language: "Language",
      skipLink: "Skip to content",
      follow: "Follow",
      explore: "Explore",
      palette: "Palette",
      today: "Today",
      loading: "Loading the timeline",
      preparing: "Preparing the first signals.",
      brandQuestion: ".alomat where have you been?",
      timeline: ".alomat Signal Timeline",
      timelineBrand: "SIGNAL TIMELINE",
      activeSignal: "Active signal",
      sourceLabel: "Source",
      timeLabel: "Time",
      weightLabel: "Weight",
      audioBrief: "Audio brief",
      aiLens: "AI lens",
      askAi: "Ask AI",
      originalSource: "Original source",
      signalCount: "10 signals",
      topbarToday: "Today's line",
      thresholdLabel: "Threshold",
      heroTitle: "Welcome, stranger.",
      heroBody: "What should the line call you? Keep it saved.",
      namePlaceholder: "you@example.com",
      nameButton: "Name yourself",
      nameHint: "Leave a name so saves, likes, and your library stay in sync.",
      authKicker: "01 - Personal memory",
      authTitle: "Save your signals.",
      authBody: "Keep your saved and liked signals in your .alomat account.",
      authEmail: "Email",
      authFirstName: "First name",
      authLastName: "Last name",
      authCode: "Verification code",
      authSubmit: "Save email",
      authNameSubmit: "Save name",
      close: "Close",
      loadEarlier: "Load earlier days",
      loadedEarlier: "Earlier days revealed",
      noMore: "You're all caught up on today",
      manifesto: "MANIFESTO",
      manifestoTitle: ".alomat — where have you been?",
      manifestoLead:
        "Not a news site. An editorial signal layer. A clear stance against the noise economy.",
      manifestoLead2: "Not where you read more — where you understand faster.",
      readManifesto: "Read the manifesto →",
      downloadApp: "Explore the app",
      footer: "made with ♥ in Uzbekistan",
      backHome: "Home",
      pageIntro: "Short, sharp, edited.",
    },
    home: {
      timeline: homeSignalStories,
      older: homeSignalOlderStories,
    },
    about: {
      preface: "This is not an about page.",
      title: "This is a manifesto.",
      kicker: "Watch closely. Know clearly.",
      intro:
        ".alomat is not a news site. Not an app either. More precisely, .alomat is first and foremost a stance. A border against the infinity of the internet. A reply to the noise economy.",
      sections: [
        {
          num: "01",
          title: "The internet is infinite. Attention is not.",
          paragraphs: [
            "We open fifty tabs and finish none of them. We give a headline eight seconds. No context, no order, no memory. We call that the noise economy, and we refuse to be part of it.",
          ],
        },
        {
          num: "02",
          title: "We cannot say what we are without saying what we are not.",
          paragraphs: [
            "We are not a news app.",
            "We are not an AI tool.",
            "We are not an endless feed.",
            "We are not everything.",
            "We are an editorial signal layer.",
            "We are a clarity product.",
            "We are your deck.",
            "We are technology and culture.",
          ],
        },
        {
          num: "03",
          title: "Our job is not to generate more content.",
          paragraphs: [
            "Our job is to filter the day’s noise and surface three signals. One card, one signal. One idea on top. Two lines of summary, one source, one action. That is it. Less is missing, more is noise.",
          ],
        },
        {
          num: "04",
          title: "Our rules are simple.",
          bullets: ["No ads.", "No data sales.", "No charge to readers — forever."],
          paragraphs: ["The reader is not the product. The reader is the counterpart."],
        },
        {
          num: "05",
          title: "This is not a feed. It is a ritual.",
          paragraphs: [
            "Open it in the morning, see the day. Check one card in the middle of the day, return to life. Check what changed at night. .alomat is not an app you open — it is a place you return to. Your place.",
          ],
        },
        {
          num: "06",
          title: "We are one person.",
          paragraphs: [
            "Oktay writes every line of the technical side and decides which signal gets through. No ad agency, no growth team, no product strategist. We are us. Decisions come from us, mistakes come from us, tone comes from us.",
          ],
        },
      ],
      closingTitle: ".alomat is not where you read more.",
      closingBody: "It is where you understand faster.",
      signature: "— Oktay",
      studio: ".alomat · one-person studio",
    },
    library: {
      title: "Library",
      lead:
        "Saved signals, liked stories, and personal lists in one ordered place.",
      stats: [
        { label: "Saved", value: "128" },
        { label: "Liked", value: "42" },
        { label: "Collections", value: "9" },
      ],
      collections: [
        {
          title: "Saved today",
          summary: "Your latest signals at a glance.",
        },
        {
          title: "Read again",
          summary: "Stories marked for longer reading later.",
        },
        {
          title: "For me",
          summary: "Private, calm, and low-noise lists.",
        },
      ],
      highlights: [
        {
          title: "Personal signals",
          summary:
            "Stories you need, categories you care about, and cards you keep around for later.",
        },
        {
          title: "Memory mode",
          summary:
            "Never lose your place. Read, liked, and saved state travel together.",
        },
        {
          title: "At a glance",
          summary:
            "A clean view with headline, summary, and source stacked in one place.",
        },
      ],
      ctaTitle: "You do not need to sign in just to build a library.",
      ctaBody:
        "But if you leave a name, saves and likes will travel with you.",
      ctaAction: "Leave a name",
    },
    relay: {
      title: "Relay",
      lead:
        "A signal delivery layer for short briefings and rhythmic updates.",
      cards: [
        {
          title: "Morning brief",
          summary:
            "Three quiet signals at sunrise. Short, calm, and enough to start the day.",
        },
        {
          title: "Midday pulse",
          summary:
            "Reorders the important turns that happened in the middle of the day.",
        },
        {
          title: "Evening wrap",
          summary:
            "The night edit. What changed, what mattered, and what will return tomorrow.",
        },
      ],
      features: [
        "High signal density",
        "Short reading time",
        "Blocks ready to resend",
      ],
      note:
        "Relay is the way to move the day’s signal forward without slowing it down or losing it.",
    },
    contact: {
      title: "Send a signal.",
      lead:
        "Pitch a story, ask about the space between the lines, or share whatever caught your eye. The .alomat desk reads every line that comes in.",
      primary: {
        label: "Signal",
        value: "signal@alomat.uz",
        note:
          "Direct channel for story tips, signals, leads, and reader feedback.",
      },
      editor: {
        label: "Editor",
        value: "editor@alomat.uz",
        note: "Editorial corrections, press requests, and content feedback.",
      },
      sponsor: {
        label: "Sponsorship",
        value: "sponsorship@alomat.uz",
        note: "Sponsorship and partnership inquiries.",
      },
      socialTitle: "Daily chatter",
      response: "We usually get back within 24 hours.",
    },
    sponsor: {
      title: "Get a place on .alomat.",
      lead:
        "There are three sponsorship models across the signal stream, the newsletter, and the app. Each one sits next to the content, never in place of it, and each one is clearly labeled.",
      packages: [
        {
          name: "Sponsor badge",
          title: "Appear in the signal stream under your brand name.",
          description:
            "A placement inside the news cards with a “Supported by [brand]” badge. The editorial flow remains intact and readers can see who is supporting the signal.",
          rows: [
            ["Placement", "Daily lead story slot, top of the signal stream"],
            ["Content", "Brand name, optional micro tagline, optional CTA"],
            ["Labeling", "Clear “Supported by” badge"],
          ],
        },
        {
          name: "Newsletter sponsorship",
          title: "The featured slot at the start of the brief.",
          description:
            "A dedicated block in our signal newsletter. One sponsor, high visibility, and a clear support layer before the summaries begin.",
          rows: [
            ["Placement", "Dedicated slot at the top of the brief"],
            ["Content", "Brand name, 1–2 lines, CTA, optional visual"],
            ["Labeling", "Clear “sponsored support” label"],
          ],
        },
        {
          name: "Advertorial",
          title: "A brand story in editorial format.",
          description:
            "A sponsor story built in the clean, short format that .alomat readers expect. It is produced from your brief with editorial standards, reads like a normal signal, and is always marked as sponsored.",
          rows: [
            ["Placement", "Inside the signal stream, same format as regular stories"],
            ["Content", "Headline, summary, optional audio and image"],
            ["Labeling", "Explicit sponsored label"],
          ],
        },
      ],
      note:
        "For packages and pricing, write to sponsorship@alomat.uz. Send your audience, goal, and preferred model in a few lines, and we will get back with a custom offer.",
    },
    lineup: {
      title: "Lineup",
      lead: "Good writing does not rush.",
      featured: {
        title:
          "A new iron curtain in AI: who does the Fable 5 ban protect?",
        summary:
          "The US restriction on Anthropic models has reopened the argument between national security and global power competition.",
        author: "Shenol Dak",
        readTime: "5 min",
        date: "1 day ago",
      },
      articles: [
        {
          title: "AI internet is no longer informing. It is consuming attention.",
          author: "Oktay Dak",
          date: "13 May 2026",
        },
      ],
      authors: [
        {
          initials: "OD",
          name: "Oktay Dak",
          role:
            "I care more about the signals inside the noise than the noise itself. I look at the fracture points of technology, AI, and internet culture.",
        },
        {
          initials: "ShD",
          name: "Shenol Dak",
          role:
            "Teacher | AI Educator | Crowdfunding Data Analytics | Generative AI Systems | AI Research & Insights",
        },
      ],
      cta: "Apply",
      ctaNote:
        "If you want to join Lineup as a writer, leave an application — the editor makes the final call.",
    },
    privacy: {
      title: "Your data and us",
      lead:
        "What we collect, why we collect it, and what control you have over it.",
      closing:
        "For privacy or data questions, you can reach oktay.dak@icloud.com.",
      sections: [
        {
          title: "The principle",
          paragraphs: [
            ".alomat works with a minimum-data principle. We only collect the data required to make the service functional and improve the experience. We do not share, sell, or advertise using personal information.",
          ],
        },
        {
          title: "Cookies and trackers",
          paragraphs: [
            "We do not use ad cookies, third-party trackers, or cross-site identifiers. Our self-hosted Umami analytics does not place cookies; it groups visits using an anonymous hash derived from your IP address and browser fingerprint, refreshed every 24 hours.",
            "The analytics script is restricted to alomat.uz domains only and is not loaded on mirrored or third-party sites.",
            "The only first-party cookie is the required session cookie that is set when you sign in to the lineup editor. It is marked HttpOnly, scoped to alomat.uz, and deleted when you sign out. Local storage on your device is only used for product preferences such as palette, dismissed notifications, and similar UI state.",
          ],
          bullets: [
            "No ad cookies",
            "No third-party trackers",
            "Only the required session cookie",
            "Local storage for interface state only",
          ],
        },
        {
          title: "What we collect on the website",
          paragraphs: [
            "Our website uses self-hosted Umami analytics at umami.alomat.uz. The analytics script loads when the site opens and is limited to alomat.uz domains.",
            "System data collected through Umami includes page views, browser type, operating system, device type, country/region derived from IP, screen resolution, referrer, and visit time.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "For privacy or data questions, you can reach oktay.dak@icloud.com.",
          ],
        },
      ],
    },
  },
};

locales.tr = {
  htmlLang: "tr",
  localeLabel: "TR",
  localeName: "T\u00fcrk\u00e7e",
  switchLabel: "UZ",
  nav: {
    about: "Hakk\u0131nda",
    library: "K\u00fct\u00fcphane",
    relay: "Relay",
    contact: "\u0130leti\u015fim",
    sponsor: "Sponsorluk",
    lineup: "Lineup",
    privacy: "Gizlilik",
  },
  ui: {
    language: "Dil",
    skipLink: "\u0130\u00e7eri\u011fe ge\u00e7",
    follow: "Takip et",
    explore: "Ke\u015ffet",
    palette: "Palet",
    today: "Bug\u00fcn",
    loading: "Zaman \u00e7izgisi y\u00fckleniyor",
    preparing: "\u0130lk sinyaller haz\u0131rlan\u0131yor.",
    brandQuestion: ".alomat, neredeydin?",
    timeline: ".alomat Sinyal Zaman \u00c7izgisi",
    timelineBrand: "S\u0130NYAL ZAMAN \u00c7\u0130ZG\u0130S\u0130",
    activeSignal: "Aktif sinyal",
    sourceLabel: "Kaynak",
    timeLabel: "Saat",
    weightLabel: "\u00d6nem",
    audioBrief: "Sesli \u00f6zet",
    aiLens: "AI bak\u0131\u015f\u0131",
    askAi: "AI'a sor",
    originalSource: "As\u0131l kaynak",
    signalCount: "10 sinyal",
    topbarToday: "Bug\u00fcn\u00fcn \u00e7izgisi",
    thresholdLabel: "E\u015fik",
    heroTitle: "Ho\u015f geldin, yabanc\u0131.",
    heroBody: "Bu \u00e7izgi sana nas\u0131l seslensin? Ad\u0131n\u0131 kaydet.",
    namePlaceholder: "sen@example.com",
    nameButton: "Ad\u0131n\u0131 yaz",
    nameHint: "Kay\u0131tlar\u0131n, be\u011fenilerin ve k\u00fct\u00fcphanen birlikte kals\u0131n diye bir ad b\u0131rak.",
    authKicker: "01 - Ki\u015fisel haf\u0131za",
    authTitle: "Sinyallerini kaydet.",
    authBody: "Kaydetti\u011fin ve be\u011fendi\u011fin sinyalleri .alomat hesab\u0131nda tut.",
    authEmail: "E-posta",
    authFirstName: "Ad",
    authLastName: "Soyad",
    authCode: "Do\u011frulama kodu",
    authSubmit: "E-postay\u0131 kaydet",
    authNameSubmit: "Ad\u0131 kaydet",
    close: "Kapat",
    loadEarlier: "\u00d6nceki g\u00fcnleri y\u00fckle",
    loadedEarlier: "\u00d6nceki g\u00fcnler g\u00f6sterildi",
    noMore: "Bug\u00fcn\u00fcn t\u00fcm sinyallerini g\u00f6rd\u00fcn",
    manifesto: "MANIFESTO",
    manifestoTitle: ".alomat — neredeydin?",
    manifestoLead: "Bir haber sitesi de\u011fil. Editoryal bir sinyal katman\u0131. G\u00fcr\u00fclt\u00fc ekonomisine kar\u015f\u0131 net bir tav\u0131r.",
    manifestoLead2: "Daha \u00e7ok okudu\u011fun de\u011fil, daha h\u0131zl\u0131 anlad\u0131\u011f\u0131n yer.",
    readManifesto: "Manifestoyu oku →",
    downloadApp: "Uygulamay\u0131 ke\u015ffet",
    footer: "\u00d6zbekistan'da ♥ ile yap\u0131ld\u0131",
    backHome: "Ana sayfa",
    pageIntro: "K\u0131sa, keskin, editoryal.",
  },
  home: {
    timeline: homeSignalStories,
    older: homeSignalOlderStories,
  },
  about: {
    preface: "Bu bir hakk\u0131m\u0131zda sayfas\u0131 de\u011fil.",
    title: "Bu bir manifesto.",
    kicker: "Yak\u0131ndan izle. A\u00e7\u0131k\u00e7a bil.",
    intro: ".alomat bir haber sitesi de\u011fil. Yaln\u0131zca bir uygulama da de\u011fil. Daha do\u011frusu .alomat her \u015feyden \u00f6nce bir tav\u0131r. \u0130nternetin sonsuzlu\u011funa kar\u015f\u0131 bir s\u0131n\u0131r. G\u00fcr\u00fclt\u00fc ekonomisine bir cevap.",
    sections: [
      {
        num: "01",
        title: "\u0130nternet sonsuz. Dikkat de\u011fil.",
        paragraphs: [
          "Elli sekme a\u00e7\u0131yor, hi\u00e7birini bitirmiyoruz. Bir ba\u015fl\u0131\u011fa sekiz saniye ay\u0131r\u0131yoruz. Ba\u011flam yok, d\u00fczen yok, haf\u0131za yok. Buna g\u00fcr\u00fclt\u00fc ekonomisi diyoruz ve par\u00e7as\u0131 olmay\u0131 reddediyoruz.",
        ],
      },
      {
        num: "02",
        title: "Ne oldu\u011fumuzu anlatmak i\u00e7in \u00f6nce ne olmad\u0131\u011f\u0131m\u0131z\u0131 s\u00f6ylemeliyiz.",
        paragraphs: [
          "Bir haber uygulamas\u0131 de\u011filiz.",
          "Bir AI arac\u0131 de\u011filiz.",
          "Sonsuz bir ak\u0131\u015f de\u011filiz.",
          "Her \u015fey de\u011filiz.",
          "Editoryal bir sinyal katman\u0131y\u0131z.",
          "Bir berrakl\u0131k \u00fcr\u00fcn\u00fcy\u00fcz.",
          "G\u00fcnl\u00fck se\u00e7kiniz.",
          "Teknolojiyi ve \u00e7evresindeki k\u00fclt\u00fcr\u00fc izliyoruz.",
        ],
      },
      {
        num: "03",
        title: "\u0130\u015fimiz daha fazla i\u00e7erik \u00fcretmek de\u011fil.",
        paragraphs: [
          "\u0130\u015fimiz g\u00fcn\u00fcn g\u00fcr\u00fclt\u00fcs\u00fcn\u00fc s\u00fcz\u00fcp en \u00f6nemli sinyalleri \u00f6ne \u00e7\u0131karmak. Bir kart, bir sinyal. Bir ana fikir, k\u0131sa bir \u00f6zet, bir kaynak ve bir eylem. Hepsi bu. Daha az\u0131 eksik, daha fazlas\u0131 g\u00fcr\u00fclt\u00fc.",
        ],
      },
      {
        num: "04",
        title: "Kurallar\u0131m\u0131z a\u00e7\u0131k.",
        bullets: ["Reklam yok.", "Veri sat\u0131\u015f\u0131 yok.", "Okurdan \u00fccret yok — sonsuza kadar."],
        paragraphs: ["Okur \u00fcr\u00fcn de\u011fildir. \u00dcr\u00fcn okur i\u00e7in vard\u0131r."],
      },
      {
        num: "05",
        title: "Bu bir ak\u0131\u015f de\u011fil. Bir rit\u00fcel.",
        paragraphs: [
          "Sabah a\u00e7, g\u00fcn\u00fc g\u00f6r. G\u00fcn ortas\u0131nda bir karta bak, sonra hayat\u0131na d\u00f6n. Gece neyin de\u011fi\u015fti\u011fini kontrol et. .alomat a\u00e7\u0131p kapatt\u0131\u011f\u0131n bir uygulama de\u011fil; geri d\u00f6nd\u00fc\u011f\u00fcn bir yer. Senin yerin.",
        ],
      },
      {
        num: "06",
        title: "Biz bir ki\u015fiyiz.",
        paragraphs: [
          "Oktay teknik sistemin her sat\u0131r\u0131n\u0131 yaz\u0131yor ve hangi sinyalin ge\u00e7ece\u011fine karar veriyor. Reklam ajans\u0131, b\u00fcy\u00fcme ekibi ya da \u00fcr\u00fcn stratejisti yok. Karar da hata da ton da bize ait.",
        ],
      },
    ],
    closingTitle: ".alomat daha \u00e7ok okudu\u011fun yer de\u011fil.",
    closingBody: "Daha h\u0131zl\u0131 anlad\u0131\u011f\u0131n yer.",
    signature: "— Oktay",
    studio: ".alomat · tek ki\u015filik st\u00fcdyo",
  },
  library: {
    title: "K\u00fct\u00fcphane",
    lead: "Kaydedilen sinyaller, be\u011fenilen hikâyeler ve ki\u015fisel listeler tek bir d\u00fczenli yerde.",
    stats: [
      { label: "Kaydedilen", value: "128" },
      { label: "Be\u011fenilen", value: "42" },
      { label: "Koleksiyon", value: "9" },
    ],
    collections: [
      { title: "Bug\u00fcn kaydedilenler", summary: "En yeni sinyallerin bir bak\u0131\u015fta." },
      { title: "Yeniden oku", summary: "Daha sonra uzun okumak i\u00e7in i\u015faretlenen hikâyeler." },
      { title: "Benim i\u00e7in", summary: "\u00d6zel, sakin ve d\u00fc\u015f\u00fck g\u00fcr\u00fclt\u00fcl\u00fc listeler." },
    ],
    highlights: [
      {
        title: "Ki\u015fisel sinyaller",
        summary: "\u0130htiyac\u0131n olan hikâyeler, \u00f6nemsedi\u011fin kategoriler ve daha sonras\u0131 i\u00e7in saklad\u0131\u011f\u0131n kartlar.",
      },
      {
        title: "Haf\u0131za modu",
        summary: "Nerede kald\u0131\u011f\u0131n\u0131 kaybetme. Okuma, be\u011fenme ve kaydetme durumu birlikte ilerler.",
      },
      {
        title: "Bir bak\u0131\u015fta",
        summary: "Ba\u015fl\u0131k, \u00f6zet ve kayna\u011f\u0131 tek yerde s\u0131ralayan temiz bir g\u00f6r\u00fcn\u00fcm.",
      },
    ],
    ctaTitle: "K\u00fct\u00fcphane olu\u015fturmak i\u00e7in giri\u015f yapman gerekmiyor.",
    ctaBody: "Ama bir ad b\u0131rak\u0131rsan kay\u0131tlar\u0131n ve be\u011fenilerin seninle gelir.",
    ctaAction: "Bir ad b\u0131rak",
  },
  relay: {
    title: "Relay",
    lead: "K\u0131sa b\u00fcltenler ve ritmik g\u00fcncellemeler i\u00e7in bir sinyal iletim katman\u0131.",
    cards: [
      { title: "Sabah \u00f6zeti", summary: "G\u00fcn do\u011farken \u00fc\u00e7 sakin sinyal. K\u0131sa, dingin ve g\u00fcne ba\u015flamak i\u00e7in yeterli." },
      { title: "\u00d6\u011fle nabz\u0131", summary: "G\u00fcn ortas\u0131nda ya\u015fanan \u00f6nemli d\u00f6n\u00fc\u015fleri yeniden s\u0131ralar." },
      { title: "Ak\u015fam \u00f6zeti", summary: "Gecenin se\u00e7kisi. Ne de\u011fi\u015fti, ne \u00f6nemliydi, yar\u0131n ne geri d\u00f6necek?" },
    ],
    features: ["Y\u00fcksek sinyal yo\u011funlu\u011fu", "K\u0131sa okuma s\u00fcresi", "Yeniden payla\u015fmaya haz\u0131r bloklar"],
    note: "Relay, g\u00fcn\u00fcn sinyalini yava\u015flatmadan ve kaybetmeden ileri ta\u015f\u0131man\u0131n yoludur.",
  },
  contact: {
    title: "Bir sinyal g\u00f6nder.",
    lead: "Bir hikâye \u00f6ner, sat\u0131r aralar\u0131n\u0131 sor ya da dikkatini \u00e7eken \u015feyi payla\u015f. .alomat masas\u0131 gelen her sat\u0131r\u0131 okur.",
    primary: {
      label: "Sinyal",
      value: "signal@alomat.uz",
      note: "Hikâye ipu\u00e7lar\u0131, sinyaller, \u00f6neriler ve okur geri bildirimleri i\u00e7in do\u011frudan kanal.",
    },
    editor: {
      label: "Edit\u00f6r",
      value: "editor@alomat.uz",
      note: "Editoryal d\u00fczeltmeler, bas\u0131n talepleri ve i\u00e7erik geri bildirimleri.",
    },
    sponsor: {
      label: "Sponsorluk",
      value: "sponsorship@alomat.uz",
      note: "Sponsorluk ve i\u015f birli\u011fi talepleri.",
    },
    socialTitle: "G\u00fcnl\u00fck sohbet",
    response: "Genellikle 24 saat i\u00e7inde yan\u0131t veririz.",
  },
  sponsor: {
    title: ".alomat'ta yerini al.",
    lead: "Sinyal ak\u0131\u015f\u0131, b\u00fclten ve uygulama genelinde \u00fc\u00e7 sponsorluk modeli var. Her biri i\u00e7eri\u011fin yan\u0131nda durur, asla onun yerini almaz ve a\u00e7\u0131k\u00e7a etiketlenir.",
    packages: [
      {
        name: "Sponsor rozeti",
        title: "Sinyal ak\u0131\u015f\u0131nda marka ad\u0131nla g\u00f6r\u00fcn.",
        description: "Haber kartlar\u0131nda 'Destekleyen: [marka]' rozetiyle yer al. Editoryal ak\u0131\u015f korunur ve okur sinyali kimin destekledi\u011fini a\u00e7\u0131k\u00e7a g\u00f6r\u00fcr.",
        rows: [
          ["Yerle\u015fim", "G\u00fcn\u00fcn \u00f6ne \u00e7\u0131kan hikâyesi, sinyal ak\u0131\u015f\u0131n\u0131n \u00fcst\u00fc"],
          ["\u0130\u00e7erik", "Marka ad\u0131, iste\u011fe ba\u011fl\u0131 k\u0131sa slogan ve CTA"],
          ["Etiket", "A\u00e7\u0131k 'Destekleyen' rozeti"],
        ],
      },
      {
        name: "B\u00fclten sponsorlu\u011fu",
        title: "\u00d6zetin ba\u015f\u0131ndaki \u00f6ne \u00e7\u0131kan alan.",
        description: "Sinyal b\u00fcltenimizde \u00f6zel bir blok. Tek sponsor, y\u00fcksek g\u00f6r\u00fcn\u00fcrl\u00fck ve \u00f6zetlerden \u00f6nce a\u00e7\u0131k bir destek katman\u0131.",
        rows: [
          ["Yerle\u015fim", "B\u00fcltenin \u00fcst\u00fcnde \u00f6zel alan"],
          ["\u0130\u00e7erik", "Marka ad\u0131, 1–2 sat\u0131r, CTA ve iste\u011fe ba\u011fl\u0131 g\u00f6rsel"],
          ["Etiket", "A\u00e7\u0131k 'sponsorlu destek' etiketi"],
        ],
      },
      {
        name: "Advertorial",
        title: "Editoryal formatta bir marka hikâyesi.",
        description: ".alomat okurunun bekledi\u011fi temiz ve k\u0131sa formatta haz\u0131rlanan sponsorlu hikâye. Verdi\u011fin brief editoryal \u00f6l\u00e7\u00fclerle i\u015flenir, normal bir sinyal gibi okunur ve her zaman sponsorlu olarak i\u015faretlenir.",
        rows: [
          ["Yerle\u015fim", "Sinyal ak\u0131\u015f\u0131nda, normal hikâyelerle ayn\u0131 formatta"],
          ["\u0130\u00e7erik", "Ba\u015fl\u0131k, \u00f6zet, iste\u011fe ba\u011fl\u0131 ses ve g\u00f6rsel"],
          ["Etiket", "A\u00e7\u0131k sponsorlu i\u00e7erik etiketi"],
        ],
      },
    ],
    note: "Paketler ve fiyatlar i\u00e7in sponsorship@alomat.uz adresine yaz. Kitleni, hedefini ve tercih etti\u011fin modeli birka\u00e7 sat\u0131rda anlat; sana \u00f6zel bir teklifle d\u00f6nelim.",
  },
  lineup: {
    title: "LINEUP",
    lead: "\u0130yi yaz\u0131 acele etmez.",
    featured: {
      title: "Yapay zekâda yeni bir demir perde: Fable 5 yasa\u011f\u0131 kimi koruyor?",
      summary: "ABD'nin Anthropic modellerine getirdi\u011fi k\u0131s\u0131tlama, ulusal g\u00fcvenlik ile k\u00fcresel g\u00fc\u00e7 rekabeti aras\u0131ndaki tart\u0131\u015fmay\u0131 yeniden a\u00e7\u0131yor.",
      author: "Shenol Dak",
      readTime: "5 dk",
      date: "1 g\u00fcn \u00f6nce",
    },
    articles: [
      {
        title: "\u0130nternet art\u0131k bilgi vermiyor. Dikkati t\u00fcketiyor.",
        author: "Oktay Dak",
        date: "13 May\u0131s 2026",
      },
    ],
    authors: [
      {
        initials: "OD",
        name: "Oktay Dak",
        role: "G\u00fcr\u00fclt\u00fcn\u00fcn kendisinden \u00e7ok i\u00e7indeki sinyallerle ilgilenir. Teknoloji, yapay zekâ ve internet k\u00fclt\u00fcr\u00fcndeki k\u0131r\u0131lma noktalar\u0131n\u0131 izler.",
      },
      {
        initials: "ShD",
        name: "Shenol Dak",
        role: "\u00d6\u011fretmen · AI e\u011fitmeni · Kitle fonlama veri analiti\u011fi · \u00dcretken AI sistemleri · AI ara\u015ft\u0131rma ve i\u00e7g\u00f6r\u00fcleri",
      },
    ],
    cta: "Ba\u015fvur",
    ctaNote: "LINEUP'a yazar olarak kat\u0131lmak istiyorsan ba\u015fvurunu b\u0131rak; son karar edit\u00f6r\u00fcn.",
  },
  privacy: {
    title: "Verilerin ve biz",
    lead: "Neleri toplad\u0131\u011f\u0131m\u0131z, neden toplad\u0131\u011f\u0131m\u0131z ve hangi kontrollerin sende oldu\u011fu.",
    closing: "Gizlilik veya veri sorular\u0131 i\u00e7in oktay.dak@icloud.com adresine yazabilirsin.",
    sections: [
      {
        title: "Temel ilke",
        paragraphs: [
          ".alomat asgari veri ilkesiyle \u00e7al\u0131\u015f\u0131r. Yaln\u0131zca hizmeti i\u015fler tutmak ve deneyimi geli\u015ftirmek i\u00e7in gereken verileri toplar\u0131z. Ki\u015fisel bilgileri payla\u015fmaz, satmaz veya reklam i\u00e7in kullanmay\u0131z.",
        ],
      },
      {
        title: "\u00c7erezler ve izleyiciler",
        paragraphs: [
          "Reklam \u00e7erezleri, \u00fc\u00e7\u00fcnc\u00fc taraf izleyiciler veya siteler aras\u0131 tan\u0131mlay\u0131c\u0131lar kullanmay\u0131z. Kendi sunucumuzdaki Umami analiti\u011fi \u00e7erez yerle\u015ftirmez; ziyaretleri IP adresin ve taray\u0131c\u0131 tan\u0131mlay\u0131c\u0131ndan \u00fcretilen, 24 saatte bir yenilenen anonim bir \u00f6zetle gruplar.",
          "Analitik beti\u011fi yaln\u0131zca alomat.uz alan adlar\u0131nda \u00e7al\u0131\u015f\u0131r; yans\u0131t\u0131lm\u0131\u015f veya \u00fc\u00e7\u00fcnc\u00fc taraf sitelerde y\u00fcklenmez.",
          "Oturum a\u00e7t\u0131\u011f\u0131nda yaln\u0131zca zorunlu oturum \u00e7erezi olu\u015fturulur. HttpOnly olarak i\u015faretlenir ve \u00e7\u0131k\u0131\u015f yapt\u0131\u011f\u0131nda silinir. Cihaz\u0131ndaki yerel depolama yaln\u0131zca renk paleti, kapat\u0131lan bildirimler ve benzeri aray\u00fcz tercihleri i\u00e7in kullan\u0131l\u0131r.",
        ],
        bullets: [
          "Reklam \u00e7erezi yok",
          "\u00dc\u00e7\u00fcnc\u00fc taraf izleyici yok",
          "Yaln\u0131zca zorunlu oturum \u00e7erezi",
          "Yerel depolama yaln\u0131zca aray\u00fcz durumu i\u00e7in",
        ],
      },
      {
        title: "Web sitesinde toplad\u0131klar\u0131m\u0131z",
        paragraphs: [
          "Web sitemiz umami.alomat.uz adresinde kendi sunucumuzda \u00e7al\u0131\u015fan Umami analiti\u011fini kullan\u0131r. Analitik beti\u011fi sayfa a\u00e7\u0131ld\u0131\u011f\u0131nda y\u00fcklenir ve yaln\u0131zca alomat.uz alan adlar\u0131yla s\u0131n\u0131rl\u0131d\u0131r.",
          "Umami \u00fczerinden g\u00f6r\u00fclen sistem verileri; sayfa g\u00f6r\u00fcnt\u00fclemeleri, taray\u0131c\u0131 t\u00fcr\u00fc, i\u015fletim sistemi, cihaz t\u00fcr\u00fc, IP'den t\u00fcretilen \u00fclke/b\u00f6lge, ekran \u00e7\u00f6z\u00fcn\u00fcrl\u00fc\u011f\u00fc, y\u00f6nlendiren adres ve ziyaret zaman\u0131d\u0131r.",
        ],
      },
      {
        title: "\u0130leti\u015fim",
        paragraphs: ["Gizlilik veya veri sorular\u0131 i\u00e7in oktay.dak@icloud.com adresine yazabilirsin."],
      },
    ],
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinPath(...parts) {
  return parts
    .filter(Boolean)
    .join("/")
    .replaceAll(/\/+/g, "/")
    .replace(/\/$/, "");
}

function pageOutputPath(localeKey, pageKey) {
  const page = pages.find((entry) => entry.key === pageKey);
  const segments = [];
  if (localeKey !== "uz") {
    segments.push(localeKey);
  }
  if (page?.slug) {
    segments.push(page.slug);
  }
  segments.push("index.html");
  return path.join(outputRoot, ...segments);
}

function flatPageOutputPath(localeKey, pageKey) {
  const page = pages.find((entry) => entry.key === pageKey);
  const slug = pageKey === "home" ? "index" : page?.slug || "index";
  if (localeKey === "uz" && pageKey === "home") {
    return path.join(outputRoot, "index.html");
  }
  if (pageKey === "home") {
    return path.join(outputRoot, `${localeKey}.html`);
  }
  const fileName = localeKey === "uz" ? `${slug}.html` : `${localeKey}-${slug}.html`;
  return path.join(outputRoot, fileName);
}

function navigationPageOutputPath(localeKey, pageKey) {
  if (pageKey === "home" || pageKey === "about" || pageKey === "lineup") {
    return flatPageOutputPath(localeKey, pageKey);
  }
  return pageOutputPath(localeKey, pageKey);
}

function lineupArticleOutputPath(localeKey, article) {
  const segments = [];
  if (localeKey !== "uz") {
    segments.push(localeKey);
  }
  segments.push("lineup", article.authorSlug, article.slug, "index.html");
  return path.join(outputRoot, ...segments);
}

function relativeHref(fromFile, toFile) {
  const relative = path.relative(path.dirname(fromFile), toFile);
  return relative.split(path.sep).join("/");
}

function text(value) {
  return escapeHtml(value ?? "");
}

function serializeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("&", "\\u0026");
}

function cleanGeneratedHtml(value) {
  return value.replace(/[ \t]+$/gm, "");
}

function localizeStoryValue(value, localeKey) {
  if (typeof value === "string") {
    return value;
  }
  return value?.[localeKey] ?? value?.en ?? value?.uz ?? "";
}

const hreflangLocaleKeys = ["uz", "en", "tr"];
const languageSwitchLocaleKeys = ["en", "uz", "tr"];

function renderLanguageSwitch(localeKey, currentFile, localeOutputPath) {
  return `<div class="language-switch" data-language-switch role="group" aria-label="${text(locales[localeKey].ui.language)}">
          ${languageSwitchLocaleKeys
            .map((targetLocaleKey) => {
              const isCurrent = targetLocaleKey === localeKey;
              const targetFile = isCurrent ? currentFile : localeOutputPath(targetLocaleKey);
              return `<a class="language-switch__button ${isCurrent ? "is-active" : "is-inactive"}" aria-label="${text(locales[targetLocaleKey].localeName)}"${isCurrent ? ' aria-current="page"' : ""} href="${text(relativeHref(currentFile, targetFile))}">${text(targetLocaleKey.toUpperCase())}</a>`;
            })
            .join("\n          ")}
        </div>`;
}

function renderSignalSort(localeKey) {
  const labels = {
    uz: {
      aria: "Xabarlarni saralash",
      newest: "YANGIDAN ESKIGA",
      popular: "ENG MASHHUR XABARLAR",
      oldest: "ESKIDAN YANGIGA",
    },
    en: {
      aria: "Sort news",
      newest: "NEWEST TO OLDEST",
      popular: "MOST POPULAR NEWS",
      oldest: "OLDEST TO NEWEST",
    },
    tr: {
      aria: "Haberleri s\u0131rala",
      newest: "YEN\u0130DEN ESK\u0130YE",
      popular: "EN POP\u00dcLER HABERLER",
      oldest: "ESK\u0130DEN YEN\u0130YE",
    },
  }[localeKey];
  const options = [
    ["newest", labels.newest],
    ["popular", labels.popular],
    ["oldest", labels.oldest],
  ];
  const menuId = `signal-sort-${localeKey}`;

  return `<div class="signal-sort" data-signal-sort>
          <button class="signal-sort__trigger" type="button" data-signal-sort-trigger data-signal-sort-value="newest" aria-label="${text(labels.aria)}" aria-haspopup="listbox" aria-controls="${text(menuId)}" aria-expanded="false">
            <span data-signal-sort-label>${text(labels.newest)}</span>
            <svg class="signal-sort__chevron" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
              <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </button>
          <div class="signal-sort__menu" id="${text(menuId)}" data-signal-sort-menu role="listbox" aria-label="${text(labels.aria)}" hidden>
            ${options
              .map(
                ([value, label], index) => `<button class="signal-sort__option${index === 0 ? " is-selected" : ""}" type="button" role="option" data-signal-sort-option="${text(value)}" data-signal-sort-label="${text(label)}" aria-selected="${index === 0 ? "true" : "false"}">${text(label)}</button>`,
              )
              .join("\n            ")}
          </div>
        </div>`;
}

function renderAlternateLinks(localeKey, currentFile, localeOutputPath) {
  return hreflangLocaleKeys
    .map((targetLocaleKey) => {
      const targetFile = targetLocaleKey === localeKey ? currentFile : localeOutputPath(targetLocaleKey);
      return `<link rel="alternate" hreflang="${text(locales[targetLocaleKey].htmlLang)}" href="${text(relativeHref(currentFile, targetFile))}" />`;
    })
    .join("\n    ");
}

function renderList(items, className = "stack-list") {
  return `<ul class="${className}">${items
    .map((item) => `<li>${text(item)}</li>`)
    .join("")}</ul>`;
}

function renderSocialChips(localeKey, currentFile) {
  return site.socials
    .map((entry) => {
      return `<button class="social-chip" type="button" aria-label="${text(entry.label)} ${text(entry.handle)}">
        <span class="social-chip__abbr">${text(entry.label)}</span>
        <span class="social-chip__handle">${text(entry.handle)}</span>
      </button>`;
    })
    .join("");
}

function renderPalettePicker(localeKey, extraClass = "") {
  const locale = locales[localeKey];
  const classes = ["palette-rail", extraClass].filter(Boolean).join(" ");
  const options = [
    { key: "0", label: localeKey === "en" ? "Palette 1" : "1. palet", bg: "#05070d", fg: "#ff4d32" },
    { key: "2", label: localeKey === "en" ? "Palette 2" : "2. palet", bg: "#efeff2", fg: "#05070d" },
    { key: "4", label: localeKey === "en" ? "Palette 3" : "3. palet", bg: "#ff4d32", fg: "#efeff2" },
  ];

  return `
      <div class="${classes}" data-palette-picker role="group" aria-label="${text(locale.ui.palette)}">
        <button class="palette-rail__trigger" type="button" data-palette-toggle aria-label="${text(locale.ui.palette)}" title="${text(locale.ui.palette)}" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.12 0-.93.74-1.67 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
          <span class="palette-rail__label" data-palette-label>${text(locale.ui.palette)}</span>
          <span class="palette-rail__sample" aria-hidden="true" style="--swatch-bg:#efeff2;--swatch-fg:#05070d"></span>
        </button>
        <div class="palette-rail__swatches" data-palette-menu aria-hidden="true">
          ${options
            .map(
              (option) => `<button class="palette-dock-swatch${option.key === "2" ? " is-active" : ""}" type="button" data-palette-option="${text(option.key)}" aria-label="${text(locale.ui.palette)}: ${text(option.label)}" aria-pressed="${option.key === "2" ? "true" : "false"}" style="--swatch-bg:${text(option.bg)};--swatch-fg:${text(option.fg)}"></button>`,
            )
            .join("\n          ")}
        </div>
      </div>`;
}

function renderThemeBootScript() {
  return `<script>(function(){try{var allowed=["0","2","4","5","6","7"];var saved=localStorage.getItem("alomat-palette")||localStorage.getItem("oesnada-feed-palette")||"2";if(allowed.indexOf(saved)<0){saved="2"}document.documentElement.dataset.palette=saved;document.documentElement.dataset.theme={0:"dark",2:"light",4:"signal",5:"light",6:"dark",7:"signal"}[saved];}catch(error){document.documentElement.dataset.palette="2";document.documentElement.dataset.theme="light";}})();</script>`;
}

function renderHeader(
  localeKey,
  pageKey,
  currentFile,
  localeOutputPath = (targetLocaleKey) => navigationPageOutputPath(targetLocaleKey, pageKey),
) {
  const locale = locales[localeKey];
  const homeFile = navigationPageOutputPath(localeKey, "home");
  const isSignalChrome = ["home", "library", "about", "lineup"].includes(pageKey);
  const navItems =
    isSignalChrome
      ? pages.filter((page) => ["about", "lineup", "library"].includes(page.key))
      : pages.filter((page) => page.key !== "home");
  const libraryLabel = { en: "LIBRARY", uz: "KUTUBXONA", tr: "K\u00dcT\u00dcPHANE" }[localeKey];

  if (isSignalChrome) {
    const libraryGateAttr = pageKey === "home" ? " data-library-gate" : "";

    return `
    <a class="skip-link" href="#content">${text(locale.ui.skipLink)}</a>
    <header class="topbar topbar--home">
      <a class="brand brand--home" href="${text(relativeHref(currentFile, homeFile))}">
        <span class="brand__stack">
          <span class="brand__topline">
            <span class="brand__name">.alomat</span>
            <span class="brand__sub">${text(locale.ui.timelineBrand)}</span>
          </span>
          <span class="brand__status">
            <span>${text(locale.ui.topbarToday)}</span>
            <span aria-hidden="true">&middot;</span>
            <span>${text(locale.ui.activeSignal)}</span>
            <span data-signal-status-time>19:01</span>
            <span aria-hidden="true">&middot;</span>
            <span data-signal-status-count>${text(locale.ui.signalCount)}</span>
          </span>
        </span>
      </a>

      <div class="controls controls--home">
        <nav class="nav nav--home signal-topbar-controls__group signal-topbar-controls__group--reader" aria-label="Primary">
        <a class="nav__item nav__item--dot${pageKey === "about" ? " is-active" : ""}"${pageKey === "about" ? ' aria-current="page"' : ""} href="${text(relativeHref(currentFile, navigationPageOutputPath(localeKey, "about")))}">
          <span class="nav__bullet" aria-hidden="true">•</span>
          <span>MANIFESTO</span>
        </a>
        <a class="nav__item nav__item--dot${pageKey === "lineup" ? " is-active" : ""}"${pageKey === "lineup" ? ' aria-current="page"' : ""} href="${text(relativeHref(currentFile, navigationPageOutputPath(localeKey, "lineup")))}">
          <span class="nav__bullet" aria-hidden="true">•</span>
          <span>LINEUP</span>
        </a>
        <a class="nav__item nav__item--library${pageKey === "library" ? " is-active" : ""}"${pageKey === "library" ? ' aria-current="page"' : ""}${libraryGateAttr} href="${text(relativeHref(currentFile, navigationPageOutputPath(localeKey, "library")))}">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M4 4.5C4 3.1 5.1 2 6.5 2H20v20H6.5C5.1 22 4 20.9 4 19.5v-15Z"></path>
            <path fill="#fff" d="M7.25 5.5h10.5v1.6H7.25zM7.25 9.1h10.5v1.6H7.25zM7.25 12.7h7.8v1.6h-7.8z"></path>
          </svg>
          <span>${text(libraryLabel)}</span>
        </a>
      </nav>

        ${renderSignalSort(localeKey)}

        ${renderLanguageSwitch(localeKey, currentFile, localeOutputPath)}

        ${renderPalettePicker(localeKey).trim()}
      </div>
    </header>`;
  }

  return `
  <a class="skip-link" href="#content">${text(locale.ui.skipLink)}</a>
  <header class="topbar">
    <a class="brand" href="${text(relativeHref(currentFile, homeFile))}">
      <span class="brand__dot"></span>
      <span class="brand__stack">
        <span class="brand__name">.alomat</span>
        <span class="brand__sub">${text(locale.ui.timeline)}</span>
      </span>
    </a>
    <nav class="nav" aria-label="Primary">
      ${navItems
        .map((item) => {
          const target = navigationPageOutputPath(localeKey, item.key);
          return `<a href="${text(relativeHref(currentFile, target))}">${text(locale.nav[item.key])}</a>`;
        })
        .join("")}
    </nav>
    <div class="controls">
      ${renderLanguageSwitch(localeKey, currentFile, localeOutputPath)}
      ${renderPalettePicker(localeKey)}
    </div>
  </header>`;
}

function renderFooter(localeKey, pageKey, currentFile) {
  const locale = locales[localeKey];
  const navItems = pages.filter((page) => page.key !== "home");
  const homeFile = navigationPageOutputPath(localeKey, "home");

  return `
  <footer class="site-footer">
    <div class="site-footer__top">
      <div class="footer-nav">
        <p class="eyebrow">${text(locale.ui.explore)}</p>
        <div class="footer-nav__links">
          <a href="${text(relativeHref(currentFile, homeFile))}">${text(locale.ui.backHome)}</a>
          ${navItems
            .map((item) => {
              const label = text(locale.nav[item.key]);
              if (item.key === "about") {
                const target = navigationPageOutputPath(localeKey, item.key);
                return `<a href="${text(relativeHref(currentFile, target))}">${label}</a>`;
              }
              if (item.key === "library") {
                const target = navigationPageOutputPath(localeKey, item.key);
                return `<a href="${text(relativeHref(currentFile, target))}" data-library-gate>${label}</a>`;
              }
              return `<a aria-disabled="true">${label}</a>`;
            })
            .join("")}
        </div>
      </div>
      <div>
        <p class="eyebrow">${text(locale.ui.follow)}</p>
        <div class="social-grid">
          ${renderSocialChips(localeKey, currentFile)}
        </div>
      </div>
    </div>
    <div class="site-footer__bottom">
      <p>${text(locale.ui.footer)}</p>
      <p>${text(site.name)} · ${text(locale.localeName)}</p>
    </div>
  </footer>`;
}

function renderHome(localeKey, currentFile) {
  const locale = locales[localeKey];
  const home = locale.home;
  const aboutFile = navigationPageOutputPath(localeKey, "about");
  const libraryFile = navigationPageOutputPath(localeKey, "library");
  const timelineSource = home.timeline ?? [];
  const timelineCards = timelineSource.slice(0, 7);
  const olderCards = [];
  const storyPayload = [...timelineCards, ...olderCards].map((card) => ({
    id: card.id,
    title: localizeStoryValue(card.title, localeKey),
    source: localizeStoryValue(card.source, localeKey),
    time: localizeStoryValue(card.time, localeKey),
    score: card.score ?? 94,
    url: card.url ?? "",
    image: card.image ?? "",
    category: card.category ?? "",
    summary: Array.isArray(card.summary?.[localeKey])
      ? card.summary[localeKey]
      : card.summary?.[localeKey]
        ?? card.summary?.en
        ?? card.summary?.uz
        ?? [],
  }));

  return `
  <main id="content" class="page page-home">
    <section class="hero hero--home">
      <div class="hero__copy hero__copy--home">
        <section class="signal-timeline signal-timeline--home" aria-label="${text(locale.ui.timeline)}">
          <div class="signal-timeline__stage" data-timeline-stage>
          <svg class="signal-timeline__route" data-timeline-route-svg aria-hidden="true" focusable="false">
            <path class="signal-timeline__route-path" data-timeline-route-path></path>
          </svg>
          <div class="signal-timeline__cursor" data-timeline-cursor aria-hidden="true"></div>
          <header class="signal-reader-gate is-guest">
            <span class="signal-reader-gate__axis" aria-hidden="true">
              <span class="signal-reader-gate__sigil">
                <span class="signal-reader-gate__broadcast" aria-hidden="true">
                  <span></span>
                </span>
              </span>
            </span>
            <div class="signal-reader-gate__content">
              <p class="eyebrow">${text(locale.ui.thresholdLabel)}</p>
              <h1 data-hero-title>${text(locale.ui.heroTitle)}</h1>
              <p class="lede" data-hero-body>${text(locale.ui.heroBody)}</p>
            </div>
            <button class="signal-reader-gate__action" type="button" aria-expanded="false" aria-controls="name-form-gate">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path fill="none" stroke="currentColor" stroke-width="2" d="M20 20a8 8 0 0 0-16 0"></path>
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"></circle>
              </svg>
              <span>${text(locale.ui.nameButton)}</span>
            </button>
            <p class="signal-reader-gate__note" data-name-display>${text(locale.ui.nameHint)}</p>
          </header>
          <div class="name-auth-backdrop" data-name-modal hidden>
            <div class="name-auth-modal" role="dialog" aria-modal="true" aria-labelledby="name-form-title">
              <button type="button" class="name-auth-modal__close" data-name-modal-close aria-label="${text(locale.ui.close)}">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                  <path fill="none" stroke="currentColor" stroke-width="2" d="M18 6 6 18"></path>
                  <path fill="none" stroke="currentColor" stroke-width="2" d="m6 6 12 12"></path>
                </svg>
              </button>
              <p class="name-auth-modal__kicker">${text(locale.ui.authKicker)}</p>
              <h2 class="name-auth-modal__title" id="name-form-title">${text(locale.ui.authTitle)}</h2>
              <p class="name-auth-modal__body-copy">${text(locale.ui.authBody)}</p>
              <form class="name-auth-modal__form name-form" id="name-form-gate" data-name-form novalidate>
                <div class="name-auth-step" data-name-email-step>
                <label class="name-auth-field" for="reader-email">
                  <span>${text(locale.ui.authEmail)}</span>
                  <input
                    id="reader-email"
                    class="name-auth-input"
                    data-name-input
                    type="email"
                    autocomplete="email"
                    placeholder="${text(locale.ui.namePlaceholder)}"
                    aria-label="${text(locale.ui.authEmail)}"
                  />
                </label>
                </div>
                <div class="name-auth-step name-auth-step--profile" data-name-profile-step hidden>
                  <label class="name-auth-field" for="reader-first-name">
                    <span>${text(locale.ui.authFirstName)}</span>
                    <input
                      id="reader-first-name"
                      class="name-auth-input"
                      data-name-first-input
                      type="text"
                      autocomplete="given-name"
                      aria-label="${text(locale.ui.authFirstName)}"
                    />
                  </label>
                  <label class="name-auth-field" for="reader-last-name">
                    <span>${text(locale.ui.authLastName)}</span>
                    <input
                      id="reader-last-name"
                      class="name-auth-input"
                      data-name-last-input
                      type="text"
                      autocomplete="family-name"
                      aria-label="${text(locale.ui.authLastName)}"
                    />
                  </label>
                </div>
                <label class="name-auth-field name-auth-field--code" for="reader-code" data-name-code-field hidden>
                  <span>${text(locale.ui.authCode)}</span>
                  <input
                    id="reader-code"
                    class="name-auth-input"
                    data-name-code-input
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxlength="6"
                    placeholder="123456"
                    aria-label="${text(locale.ui.authCode)}"
                    hidden
                  />
                </label>
                <p class="name-auth-status" data-name-auth-status hidden></p>
                <button type="submit" class="name-auth-primary-button" data-name-auth-submit>
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
                    <path fill="none" stroke="currentColor" stroke-width="2" d="M4 4h16v16H4z"></path>
                    <path fill="none" stroke="currentColor" stroke-width="2" d="m4 7 8 6 8-6"></path>
                  </svg>
                  <span data-name-submit-label>${text(locale.ui.authSubmit)}</span>
                </button>
              </form>
            </div>
          </div>
          <div class="signal-timeline__items" data-signal-timeline-items>
            <div class="signal-timeline__day-marker" aria-hidden="true">
              <span class="signal-timeline__day-pill">${text(locale.ui.today)}</span>
            </div>
            ${timelineCards.map((card, index) => renderTimelineItem(card, index, localeKey)).join("")}
            <div class="signal-timeline__sentinel" aria-hidden="true"></div>
            <div class="signal-timeline__earlier-gate">
              <span class="signal-timeline__earlier-hint">${text(locale.ui.noMore)}</span>
              <button class="signal-timeline__load-earlier" type="button" data-load-earlier aria-disabled="true" tabindex="-1">
                <span class="signal-timeline__load-earlier-chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                    <path fill="none" stroke="currentColor" stroke-width="2" d="m6 9 6 6 6-6"></path>
                  </svg>
                </span>
                ${text(locale.ui.loadEarlier)}
              </button>
            </div>
          </div>
          </div>
        </section>
      </div>

      <aside class="signal-detail signal-detail--intro" data-signal-detail>
        <div class="signal-detail__visual" data-signal-detail-visual aria-hidden="true"></div>
        <div class="signal-detail__content" data-signal-detail-content>
          <p class="signal-detail__topline">${text(locale.ui.manifesto)}</p>
          <h2>${text(locale.ui.manifestoTitle)}</h2>
          <div class="signal-detail__summary">
            <p>${text(locale.ui.manifestoLead)}</p>
            <p>${text(locale.ui.manifestoLead2)}</p>
          </div>
          <div class="signal-detail__lower">
            <div class="signal-detail__actions signal-detail__actions--intro">
              <a class="signal-detail__action signal-detail__action--ghost" href="${text(relativeHref(currentFile, aboutFile))}">
                ${text(locale.ui.readManifesto)}
              </a>
              <a class="signal-detail__action signal-detail__action--ghost signal-detail__action--mute" data-library-gate href="${text(relativeHref(currentFile, libraryFile))}">
                ${text(locale.nav.library)}
              </a>
            </div>
          </div>
        </div>
      </aside>
      <script type="application/json" data-signal-stories>${serializeJson(storyPayload)}</script>
    </section>
  </main>`;
}

function renderTimelineItem(card, index, localeKey) {
  const titleValue = localizeStoryValue(card.title, localeKey);
  const olderAttr = card.older ? ` data-older="true" hidden` : "";
  const shift = Number.isFinite(card.shift) ? card.shift : 0;
  const side = index % 2 === 0 ? "left" : "right";
  return `
    <article class="signal-timeline__item${card.older ? " signal-timeline__item--older" : ""}" data-side="${side}" data-story-id="${text(card.id)}" data-timeline-index="${index}" style="--timeline-headline-size: 1.420rem; --timeline-headline-shift: ${shift}px; --timeline-importance: ${card.importance ?? 0.94}; --timeline-widget-width: 520px; --timeline-widget-pad-x: 19.4px; --timeline-widget-pad-y: 13.6px;"${olderAttr}>
      <button type="button" class="signal-timeline__headline-button">
        <span class="signal-timeline__headline-text">${text(titleValue)}</span>
      </button>
    </article>`;
}

function getManifesto(localeKey) {
  if (localeKey === "tr") {
    return {
      back: "ana sayfa",
      kicker: "Bu bir hakk\u0131m\u0131zda sayfas\u0131 de\u011fil.",
      kickerStrong: "Bu bir manifesto.",
      titleA: "Yak\u0131ndan izle.",
      titleB: "A\u00e7\u0131k\u00e7a bil.",
      titleSub: "G\u00fcr\u00fclt\u00fcye de\u011fil, \u00f6ze bak.",
      lede: ".alomat bir haber sitesi de\u011fil. Yaln\u0131zca bir uygulama da de\u011fil. Daha do\u011frusu .alomat her \u015feyden \u00f6nce bir <strong>tav\u0131r.</strong> \u0130nternetin sonsuzlu\u011funa kar\u015f\u0131 bir s\u0131n\u0131r. G\u00fcr\u00fclt\u00fc ekonomisine bir cevap.",
      tenets: [
        {
          num: "01",
          title: `\u0130nternet sonsuz.<br><span class="signal">Dikkat de\u011fil.</span>`,
          body: "Elli sekme a\u00e7\u0131yor, hi\u00e7birini bitirmiyoruz. Bir ba\u015fl\u0131\u011fa sekiz saniye ay\u0131r\u0131yoruz. Ba\u011flam yok, d\u00fczen yok, haf\u0131za yok. Buna <strong>g\u00fcr\u00fclt\u00fc ekonomisi</strong> diyoruz ve par\u00e7as\u0131 olmay\u0131 reddediyoruz.",
        },
        {
          num: "02",
          title: "Ne oldu\u011fumuzu anlatmak i\u00e7in \u00f6nce ne olmad\u0131\u011f\u0131m\u0131z\u0131 s\u00f6ylemeliyiz.",
          not: ["Bir haber uygulamas\u0131 de\u011filiz.", "Bir AI arac\u0131 de\u011filiz.", "Sonsuz bir ak\u0131\u015f de\u011filiz.", "Her \u015fey de\u011filiz."],
          is: [
            `Editoryal bir <span class="signal">sinyal katman\u0131y\u0131z.</span>`,
            `Bir <span class="signal">berrakl\u0131k</span> \u00fcr\u00fcn\u00fcy\u00fcz.`,
            `<span class="signal">G\u00fcnl\u00fck se\u00e7kiniz.</span>`,
            `<span class="signal">Teknolojiyi ve \u00e7evresindeki k\u00fclt\u00fcr\u00fc izliyoruz.</span>`,
          ],
        },
        {
          num: "03",
          title: `\u0130\u015fimiz <span class="signal">daha fazla i\u00e7erik \u00fcretmek de\u011fil.</span>`,
          body: "\u0130\u015fimiz g\u00fcn\u00fcn g\u00fcr\u00fclt\u00fcs\u00fcn\u00fc s\u00fcz\u00fcp en \u00f6nemli sinyalleri \u00f6ne \u00e7\u0131karmak. Bir kart, bir sinyal. Bir ana fikir, k\u0131sa bir \u00f6zet, bir kaynak ve bir eylem. Hepsi bu. Daha az\u0131 eksik, daha fazlas\u0131 g\u00fcr\u00fclt\u00fc.",
        },
        {
          num: "04",
          title: `Kurallar\u0131m\u0131z <span class="signal">a\u00e7\u0131k.</span>`,
          rules: ["Reklam yok.", "Veri sat\u0131\u015f\u0131 yok.", "Okurdan \u00fccret yok — sonsuza kadar."],
          body: "Okur <em>\u00fcr\u00fcn</em> de\u011fildir. <strong class=\"signal\">\u00dcr\u00fcn okur i\u00e7in vard\u0131r.</strong>",
        },
        {
          num: "05",
          title: `Bu bir ak\u0131\u015f de\u011fil. <span class="signal">Bir rit\u00fcel.</span>`,
          body: "Sabah a\u00e7, g\u00fcn\u00fc g\u00f6r. G\u00fcn ortas\u0131nda bir karta bak, sonra hayat\u0131na d\u00f6n. Gece neyin de\u011fi\u015fti\u011fini kontrol et. .alomat a\u00e7\u0131p kapatt\u0131\u011f\u0131n bir uygulama de\u011fil; geri d\u00f6nd\u00fc\u011f\u00fcn bir yer. Senin yerin.",
        },
        {
          num: "06",
          title: `Biz <span class="signal">bir ki\u015fiyiz.</span>`,
          body: "Oktay teknik sistemin her sat\u0131r\u0131n\u0131 yaz\u0131yor ve hangi sinyalin ge\u00e7ece\u011fine karar veriyor. Reklam ajans\u0131, b\u00fcy\u00fcme ekibi ya da \u00fcr\u00fcn stratejisti yok. <strong>Karar da hata da ton da bize ait.</strong>",
        },
      ],
      closingKicker: "Son sat\u0131r.",
      closingQuoteA: ".alomat daha \u00e7ok okudu\u011fun yer de\u011fil.",
      closingQuoteB: "Daha h\u0131zl\u0131 anlad\u0131\u011f\u0131n yer.",
      closingSub: "Daha az oku. Daha h\u0131zl\u0131 anla.",
      sign: "— Oktay",
      studio: ".alomat · tek ki\u015filik st\u00fcdyo",
    };
  }

  if (localeKey === "en") {
    return {
      back: "home",
      kicker: "This is not an about page.",
      kickerStrong: "This is a manifesto.",
      titleA: "Watch closely.",
      titleB: "Know clearly.",
      titleSub: "Yaqindan kuzat. Aniq bil.",
      lede:
        ".alomat is not a news site. It is not just an app either. More precisely, .alomat is first a <strong>position.</strong> An edge against the endless internet. An answer to the noise economy.",
      tenets: [
        {
          num: "01",
          title: `The internet is endless.<br><span class="signal">Attention is not.</span>`,
          body:
            "We open fifty tabs and finish none. We give a headline eight seconds. No context, no order, nothing remembered. We call this the <strong>noise economy</strong> and we refuse to become part of it.",
        },
        {
          num: "02",
          title: "We cannot explain what we are without saying what we are not.",
          not: ["We are not a news app.", "We are not an AI tool.", "We are not an infinite feed.", "We are not everything."],
          is: [
            `We are an editorial <span class="signal">signal layer.</span>`,
            `We are a <span class="signal">clarity</span> product.`,
            `We are <span class="signal">your deck.</span>`,
            `We are <span class="signal">technology and its surroundings.</span>`,
          ],
        },
        {
          num: "03",
          title: `Producing more content <span class="signal">is not our job.</span>`,
          body:
            "Our job is to filter the day&apos;s noise and bring forward its clearest signs. One card, one signal. One idea on top. A short summary, a source, an action. That is all. Less is missing, more is noise.",
        },
        {
          num: "04",
          title: `Our rules are <span class="signal">clear.</span>`,
          rules: ["No ads.", "No data sales.", "Not a cent from readers, forever."],
          body: "The reader is not the <em>product</em>. The reader is the <strong class=\"signal\">person we answer to.</strong>",
        },
        {
          num: "05",
          title: `Not a feed. <span class="signal">A ritual.</span>`,
          body:
            "Open it in the morning and see the day. One card during the day, then return to life. Check what changed at night. .alomat is not an app you open; it is a place you come back to. Your place.",
        },
        {
          num: "06",
          title: `We are <span class="signal">one person.</span>`,
          body:
            "Oktay writes every line of the technical system and also decides which signal passes through. No ad agency, no growth team, no product strategist. <strong>We are us.</strong> The decision is ours, the mistake is ours, the tone is ours.",
        },
      ],
      closingKicker: "Last line.",
      closingQuoteA: ".alomat is not where you read more.",
      closingQuoteB: "It is where you understand faster.",
      closingSub: ".alomat ko'proq o'qiydigan joy emas. Tezroq tushunadigan joy.",
      sign: "— Oktay",
      studio: ".alomat · one-person studio",
    };
  }

  return {
    back: "ana sahifa",
    kicker: "Bu biz haqimizdagi sahifa emas.",
    kickerStrong: "Bu — manifest.",
    titleA: "Diqqat bilan kuzat.",
    titleB: "Mohiyatni aniq bil.",
    titleSub: "Shovqinga emas, mohiyatga qarang.",
    lede:
      ".alomat yangiliklar sayti emas. Shunchaki ilova ham emas. Aniqrog‘i, .alomat — avvalo <strong>pozitsiya.</strong> Internetning cheksizligiga qarshi qo‘yilgan chegara. Shovqin iqtisodiga javob.",
    tenets: [
      {
        num: "01",
        title: `Internet cheksiz.<br><span class="signal">Diqqat emas.</span>`,
        body:
          "Biz ellikta sahifa ochamiz-u, birortasini oxirigacha o‘qimaymiz. Bir sarlavhaga sakkiz soniya ajratamiz. Kontekst yo‘q, tartib yo‘q, esda qoladigan narsa yo‘q. Biz buni <strong>shovqin iqtisodi</strong> deymiz va uning bir qismi bo‘lishni rad etamiz.",
      },
      {
        num: "02",
        title: "Nima ekanimizni tushuntirish uchun avval nima emasligimizni aytishimiz kerak.",
        not: [
          "Biz yangilik ilovasi emasmiz.",
          "Biz sun’iy intellekt vositasi emasmiz.",
          "Biz cheksiz yangiliklar lentasi emasmiz.",
          "Biz hamma narsa emasmiz.",
        ],
        is: [
          `Biz tahririy <span class="signal">signal qatlamimiz.</span>`,
          `Biz <span class="signal">aniqlik</span> mahsulotimiz.`,
          `Biz <span class="signal">sizning kunlik brifingingizmiz.</span>`,
          `Biz <span class="signal">texnologiya va uning atrofidagi madaniyatni kuzatamiz.</span>`,
        ],
      },
      {
        num: "03",
        title: `Bizning vazifamiz <span class="signal">ko‘proq kontent ishlab chiqarish emas.</span>`,
        body:
          "Bizning vazifamiz kun shovqinini saralab, eng muhim signallarni oldinga chiqarish. Bitta karta, bitta signal. Bitta asosiy fikr, qisqa xulosa, bitta manba va bitta amal. Hammasi shu. Bundan kami yetarli emas, ortig‘i esa shovqin.",
      },
      {
        num: "04",
        title: `Qoidalarimiz <span class="signal">aniq.</span>`,
        rules: ["Reklama yo‘q.", "Ma’lumot sotilmaydi.", "O‘quvchidan bir tiyin ham olinmaydi — abadiy."],
        body: "O‘quvchi <em>mahsulot</em> emas. <strong class=\"signal\">Mahsulot o‘quvchi uchun yaratiladi.</strong>",
      },
      {
        num: "05",
        title: `Bu yangiliklar lentasi emas. <span class="signal">Bu kundalik odat.</span>`,
        body:
          "Ertalab oching va kunning manzarasini ko‘ring. Kun o‘rtasida bitta signalni o‘qing, so‘ng hayotingizga qayting. Kechqurun nima o‘zgarganini tekshiring. .alomat shunchaki ochib qo‘yiladigan ilova emas — qaytib kelinadigan makon. Sizning makoningiz.",
      },
      {
        num: "06",
        title: `Biz <span class="signal">bir kishilik studiyamiz.</span>`,
        body:
          "Oktay tizimning har bir texnik satrini yozadi va qaysi signal e’lon qilinishini ham o‘zi tanlaydi. Reklama agentligi ham, o‘sish jamoasi ham, mahsulot strategisti ham yo‘q. <strong>Qaror ham, xato ham, ohang ham o‘zimizniki.</strong>",
      },
    ],
    closingKicker: "So‘nggi satr.",
    closingQuoteA: ".alomat ko‘proq o‘qiydigan joy emas.",
    closingQuoteB: "Tezroq tushunadigan joy.",
    closingSub: "Kamroq o‘qing. Tezroq anglang.",
    sign: "— Oktay",
    studio: ".alomat · bir kishilik studiya",
  };
}

const lineupArticleDetails = [
  {
    id: "fable-5",
    authorSlug: "senol-dak",
    slug: "aida-yangi-temir-parda-fable-5-taqiqi-kimni-himoya-qiladi",
    image:
      "https://cdn1.wiro.ai/94ba0b39-504e320f-0b1a182a-a37a2a0c-e28daf4a-1ff0d4d9-a30cfff8-0bff6445-26581401-464e6371-181d8a7c-effaf4d5/2212310_Image.png",
    category: { uz: "Siyosat", en: "Politics", tr: "Siyaset" },
    date: { uz: "2026-yil 13-iyun", en: "13 June 2026", tr: "13 Haziran 2026" },
    title: {
      uz: "Sun’iy intellektdagi yangi temir parda: Fable 5 taqiqi kimni himoya qiladi?",
      en: "A new iron curtain in AI: who does the Fable 5 ban protect?",
      tr: "Yapay zekâda yeni bir demir perde: Fable 5 yasa\u011f\u0131 kimi koruyor?",
    },
    author: { initials: "ShD", name: "Shenol Dak" },
    readTime: { uz: "5 daqiqalik mutolaa", en: "5 min read", tr: "5 dk okuma" },
    audioTime: "0:00 / 6:11",
    body: {
      uz: [
        "Sun'iy intellekt tarixidagi eng keskin burilishlardan biriga guvoh bo'lyapmiz. AQSH hukumati Anthropic'ning ilg'or modellariga kirishni cheklashi bilan texnologiya endi faqat mahsulot emas, strategik hududga aylandi.",
        "Savol oddiy ko'rinadi: kuchli model kimning qo'lida bo'lishi kerak? Lekin javob iqtisod, diplomatiya va xavfsizlik orasidagi juda nozik chiziqda turibdi.",
        "Fable 5 taqiqi bir kompaniyani to'xtatishdan ko'ra kattaroq signal beradi. U AI infratuzilmasining yangi chegaralari chizilayotganini ko'rsatadi.",
        "Bugun modelga kirish huquqi chip, bulut, ma'lumot va iste'dod bilan bir qatorda geosiyosiy qurolga aylanmoqda. Bir davlat modelni eksport qilganda faqat kod emas, qaror qabul qilish tezligini ham eksport qiladi.",
        "Shuning uchun bu taqiq kimni himoya qilayotgani haqidagi savol ochiq qoladi. Foydalanuvchilarnimi, bozorniymi, davlat xavfsizliginimi yoki mavjud kuch balansinimi?",
        "Eng muhim nuqta shuki: AI bo'yicha kelajakdagi raqobat faqat kim yaxshiroq model yaratishi bilan belgilanmaydi. Kim modelga kirishni boshqarishi ham o'yinning markazida bo'ladi.",
      ],
      en: [
        "We are watching one of the sharpest turning points in AI. With the US restricting access to advanced Anthropic models, technology is no longer only a product; it is becoming strategic territory.",
        "The question sounds simple: who should hold the most capable models? The answer sits on a thin line between economics, diplomacy, and security.",
        "The Fable 5 ban signals something larger than pressure on one company. It shows that new borders are being drawn around AI infrastructure.",
        "Access to models now sits beside chips, cloud, data, and talent as a geopolitical lever. Exporting a model can also mean exporting decision speed.",
        "That is why the question of who the ban protects remains open: users, the market, national security, or the existing balance of power.",
        "The important point is this: future AI competition will not only be about who builds the best model. It will also be about who controls access to it.",
      ],
      tr: [
        "Yapay zekâ tarihinin en sert d\u00f6n\u00fcm noktalar\u0131ndan birini izliyoruz. ABD'nin geli\u015fmi\u015f Anthropic modellerine eri\u015fimi k\u0131s\u0131tlamas\u0131yla teknoloji art\u0131k yaln\u0131zca bir \u00fcr\u00fcn de\u011fil, stratejik bir alan.",
        "Soru basit g\u00f6r\u00fcn\u00fcyor: en g\u00fc\u00e7l\u00fc modeller kimin elinde olmal\u0131? Yan\u0131t ekonomi, diplomasi ve g\u00fcvenlik aras\u0131ndaki ince \u00e7izgide duruyor.",
        "Fable 5 yasa\u011f\u0131 tek bir \u015firkete bask\u0131 kurmaktan daha b\u00fcy\u00fck bir sinyal veriyor. AI altyap\u0131s\u0131n\u0131n \u00e7evresine yeni s\u0131n\u0131rlar \u00e7izildi\u011fini g\u00f6steriyor.",
        "Modellere eri\u015fim art\u0131k \u00e7ip, bulut, veri ve yetenekle birlikte jeopolitik bir kald\u0131ra\u00e7. Bir modeli ihra\u00e7 etmek, karar verme h\u0131z\u0131n\u0131 da ihra\u00e7 etmek anlam\u0131na gelebilir.",
        "Bu nedenle yasa\u011f\u0131n kimi korudu\u011fu sorusu a\u00e7\u0131k kal\u0131yor: kullan\u0131c\u0131lar\u0131 m\u0131, piyasay\u0131 m\u0131, ulusal g\u00fcvenli\u011fi mi, yoksa mevcut g\u00fc\u00e7 dengesini mi?",
        "As\u0131l nokta \u015fu: gelecekteki AI rekabeti yaln\u0131zca en iyi modeli kimin kurdu\u011fu \u00fczerinden ilerlemeyecek. Eri\u015fimi kimin kontrol etti\u011fi de oyunun merkezinde olacak.",
      ],
    },
  },
  {
    id: "attention",
    authorSlug: "oktay-dak",
    slug: "internet-endi-malumot-bermaydi-diqqatni-yutadi",
    image:
      "https://cdn1.wiro.ai/f7c0c2a1-d7a0bdcf-a060f16f-23986f17-d3617ce3-0ce7a132-2cc2a246-28880a97-03a40838-a420fa9d-850c160f-71a17c6d/1867404_Image.png",
    category: { uz: "AI", en: "AI", tr: "AI" },
    date: { uz: "2026-yil 13-may", en: "13 May 2026", tr: "13 May\u0131s 2026" },
    title: {
      uz: "Internet endi ma’lumot bermaydi. U diqqatni yutadi.",
      en: "AI internet is no longer informing. It is consuming attention.",
      tr: "\u0130nternet art\u0131k bilgi vermiyor. Dikkati t\u00fcketiyor.",
    },
    author: { initials: "OD", name: "Oktay Dak" },
    readTime: { uz: "3 daqiqalik mutolaa", en: "3 min read", tr: "3 dk okuma" },
    audioTime: "0:00 / 4:38",
    body: {
      uz: [
        "Bir paytlar internet insoniyatning eng katta bilim tarmog'i deb o'ylardik. Balki haqiqatan ham shunday edi.",
        "Biror narsani o'rganmoqchi bo'lsangiz, qidirar edingiz. Dunyodagi boshqa odamlar bilan gaplashar, yangi ko'nikma o'rganar, ilgari uchratmagan fikrlar bilan to'qnashardingiz.",
        "Keyin sekin o'zgarish boshlandi. Internet bilim tashishni to'xtatib, diqqat tashishga o'tdi.",
        "Endi muhim narsa haqiqat emas, ushlab qolish kuchi bo'lib qoldi: nima bosiladi, nima aylantiriladi, nima reaksiya uyg'otadi.",
        "Muammo ma'lumot yetishmasligi emas. Aksincha, o'lchovi yo'q ma'lumot ko'pligi. Muhim yangilik, shovqin, mem va reklama bir xil og'irlikda ekranimizga keladi.",
        "Shu sabab .alomat ko'proq kontent ishlab chiqarish uchun emas, ritmni qaytarish uchun bor. Nima muhim, nima shunchaki hype, nima kelajakni o'zgartirishi mumkinligini sokinroq ko'rsatish uchun.",
      ],
      en: [
        "At one point we thought the internet was humanity's largest knowledge network. Maybe it really was.",
        "When you wanted to learn something, you searched. You could talk to people across the world, pick up a skill, and meet ideas you had never seen before.",
        "Then the shift happened quietly. The internet stopped carrying knowledge and started carrying attention.",
        "What mattered was no longer only truth, but retention: what gets clicked, what gets scrolled, what creates reaction.",
        "The problem is not a lack of information. It is information without scale. Important news, noise, memes, and ads arrive with the same weight on the same screen.",
        "That is why .alomat is not here to produce more content. It is here to restore rhythm and show, more calmly, what matters, what is hype, and what may change the future.",
      ],
      tr: [
        "Bir zamanlar internetin insanl\u0131\u011f\u0131n en b\u00fcy\u00fck bilgi a\u011f\u0131 oldu\u011funu d\u00fc\u015f\u00fcn\u00fcyorduk. Belki ger\u00e7ekten \u00f6yleydi.",
        "Bir \u015fey \u00f6\u011frenmek istedi\u011finde arard\u0131n. D\u00fcnyan\u0131n ba\u015fka yerlerindeki insanlarla konu\u015fur, yeni bir beceri edinir ve daha \u00f6nce g\u00f6rmedi\u011fin fikirlerle kar\u015f\u0131la\u015f\u0131rd\u0131n.",
        "Sonra de\u011fi\u015fim sessizce ba\u015flad\u0131. \u0130nternet bilgiyi ta\u015f\u0131may\u0131 b\u0131rak\u0131p dikkati ta\u015f\u0131maya ba\u015flad\u0131.",
        "\u00d6nemli olan art\u0131k yaln\u0131zca ger\u00e7ek de\u011fil, elde tutma g\u00fcc\u00fcyd\u00fc: neye t\u0131klan\u0131yor, ne kayd\u0131r\u0131l\u0131yor, ne tepki yarat\u0131yor?",
        "Sorun bilgi eksikli\u011fi de\u011fil. \u00d6l\u00e7e\u011fi olmayan bilgi fazlal\u0131\u011f\u0131. \u00d6nemli haber, g\u00fcr\u00fclt\u00fc, mem ve reklam ayn\u0131 a\u011f\u0131rl\u0131kla ayn\u0131 ekrana geliyor.",
        "Bu y\u00fczden .alomat daha fazla i\u00e7erik \u00fcretmek i\u00e7in de\u011fil, ritmi geri getirmek i\u00e7in var. Neyin \u00f6nemli, neyin yaln\u0131zca abart\u0131 ve neyin gelece\u011fi de\u011fi\u015ftirebilece\u011fini daha sakin g\u00f6stermek i\u00e7in.",
      ],
    },
  },
];

function getLineupArticleById(id) {
  return lineupArticleDetails.find((article) => article.id === id);
}

function renderAbout(localeKey, currentFile) {
  const manifesto = getManifesto(localeKey);
  return `
  <main id="content" class="static-page manifesto-page">
    <article class="manifesto">
      <header class="manifesto__masthead">
        <p class="manifesto__kicker">${text(manifesto.kicker)}</p>
        <p class="manifesto__kicker manifesto__kicker--strong">${text(manifesto.kickerStrong)}</p>
      </header>
      <section class="manifesto__opener">
        <h1 class="manifesto__title">${text(manifesto.titleA)}<br><span class="signal">${text(manifesto.titleB)}</span></h1>
        <p class="manifesto__title-en">${text(manifesto.titleSub)}</p>
      </section>
      <section class="manifesto__lede">
        <p>${manifesto.lede}</p>
      </section>
      ${manifesto.tenets
        .map((tenet) => {
          if (tenet.not && tenet.is) {
            return `
      <section class="manifesto__tenet">
        <p class="manifesto__num">${text(tenet.num)}</p>
        <h2 class="manifesto__statement">${tenet.title}</h2>
        <div class="manifesto__credo">
          ${tenet.not.map((item) => `<p>${text(item)}</p>`).join("")}
        </div>
        <div class="manifesto__credo manifesto__credo--is">
          ${tenet.is.map((item) => `<p>${item}</p>`).join("")}
        </div>
      </section>`;
          }

          if (tenet.rules) {
            return `
      <section class="manifesto__tenet manifesto__tenet--declare">
        <p class="manifesto__num">${text(tenet.num)}</p>
        <h2 class="manifesto__statement">${tenet.title}</h2>
        <ul class="manifesto__rules">
          ${tenet.rules.map((rule) => `<li>${text(rule)}</li>`).join("")}
        </ul>
        <p class="manifesto__body">${tenet.body}</p>
      </section>`;
          }

          return `
      <section class="manifesto__tenet">
        <p class="manifesto__num">${text(tenet.num)}</p>
        <h2 class="manifesto__statement">${tenet.title}</h2>
        <p class="manifesto__body">${tenet.body}</p>
      </section>`;
        })
        .join("")}
      <section class="manifesto__closing">
        <p class="manifesto__closing-kicker">${text(manifesto.closingKicker)}</p>
        <h2 class="manifesto__closing-quote">${text(manifesto.closingQuoteA)}<br><span class="signal">${text(manifesto.closingQuoteB)}</span></h2>
        <p class="manifesto__closing-en">${text(manifesto.closingSub)}</p>
      </section>
      <footer class="manifesto__sign">
        <p class="manifesto__sign-names">${text(manifesto.sign)}</p>
        <p class="manifesto__sign-studio">${text(manifesto.studio)}</p>
      </footer>
    </article>
  </main>`;
}

function renderLibrary(localeKey, currentFile) {
  const locale = locales[localeKey];
  const library = locale.library;
  const labels = {
    en: {
      archive: "Saved signal archive",
      metrics: [["saved", "Saved"], ["liked", "Liked"], ["total", "Total"]],
      empty: "No saved or liked signals yet.",
      note: "Library state",
      localTitle: "Your library stays in this browser.",
      localBody: "Saved and liked signals appear here immediately. Account synchronization can be added later.",
    },
    uz: {
      archive: "Saqlangan signal arxivi",
      metrics: [["saved", "Saqlangan"], ["liked", "Yoqtirilgan"], ["total", "Jami"]],
      empty: "Hali saqlangan yoki yoqtirilgan signallar yo'q.",
      note: "Kutubxona holati",
      localTitle: "Kutubxonangiz shu brauzerda saqlanadi.",
      localBody: "Saqlangan va yoqtirilgan signallar darhol shu yerda ko'rinadi. Hisoblararo sinxronizatsiya keyinroq qo'shiladi.",
    },
    tr: {
      archive: "Kaydedilen sinyal ar\u015fivi",
      metrics: [["saved", "Kaydedilen"], ["liked", "Be\u011fenilen"], ["total", "Toplam"]],
      empty: "Hen\u00fcz kaydedilen veya be\u011fenilen sinyal yok.",
      note: "K\u00fct\u00fcphane durumu",
      localTitle: "K\u00fct\u00fcphanen bu taray\u0131c\u0131da kal\u0131r.",
      localBody: "Kaydetti\u011fin ve be\u011fendi\u011fin sinyaller burada hemen g\u00f6r\u00fcn\u00fcr. Hesap e\u015fitleme daha sonra eklenebilir.",
    },
  }[localeKey];
  return `
  <main id="content" class="page page-library">
    <section class="library-shell" aria-labelledby="library-title">
      <div class="library-hero">
        <p class="library-kicker">${text(locale.nav.library)}</p>
        <h1 id="library-title">${text(library.title)}</h1>
        <p>${text(library.lead)}</p>
      </div>

      <div class="library-status-strip" aria-label="${text(labels.archive)}">
        ${labels.metrics
          .map(
            ([key, label]) => `
          <span class="library-status-strip__item">
            <strong data-library-count="${key}">0</strong>
            <span>${text(label)}</span>
          </span>`,
          )
          .join("")}
      </div>

      <section class="library-signal-list" data-library-list aria-label="${text(labels.archive)}"></section>
      <p class="library-empty" data-library-empty>${text(labels.empty)}</p>

      <section class="library-memory">
        <div>
          <p class="library-memory__label">${text(labels.note)}</p>
          <h2>${text(labels.localTitle)}</h2>
          <p>${text(labels.localBody)}</p>
        </div>
      </section>
    </section>
    </main>`;
}

function renderRelay(localeKey) {
  const locale = locales[localeKey];
  const relay = locale.relay;
  return `
  <main id="content" class="page page-detail">
    <section class="page-hero">
      <p class="eyebrow">${text(locale.nav.relay)}</p>
      <h1>${text(relay.title)}</h1>
      <p class="lede">${text(relay.lead)}</p>
    </section>
    <section class="relay-grid">
      ${relay.cards
        .map(
          (card) => `
        <article class="relay-card">
          <h2>${text(card.title)}</h2>
          <p>${text(card.summary)}</p>
        </article>`,
        )
        .join("")}
    </section>
    <section class="relay-panel">
      <div class="relay-panel__col">
        <h2>${text({ en: "Relay features", uz: "Relay imkoniyatlari", tr: "Relay \u00f6zellikleri" }[localeKey])}</h2>
        <ul class="stack-list">
          ${relay.features.map((feature) => `<li>${text(feature)}</li>`).join("")}
        </ul>
      </div>
      <div class="relay-panel__col">
        <p>${text(relay.note)}</p>
      </div>
    </section>
  </main>`;
}

function renderContact(localeKey) {
  const locale = locales[localeKey];
  const contact = locale.contact;
  return `
  <main id="content" class="page page-detail">
    <section class="page-hero">
      <p class="eyebrow">${text(locale.nav.contact)}</p>
      <h1>${text(contact.title)}</h1>
      <p class="lede">${text(contact.lead)}</p>
    </section>
    <section class="contact-grid">
      <article class="contact-card contact-card--primary">
        <span class="contact-card__label">${text(contact.primary.label)}</span>
        <a href="mailto:${text(contact.primary.value)}">${text(contact.primary.value)}</a>
        <p>${text(contact.primary.note)}</p>
      </article>
      <article class="contact-card">
        <span class="contact-card__label">${text(contact.editor.label)}</span>
        <a href="mailto:${text(contact.editor.value)}">${text(contact.editor.value)}</a>
        <p>${text(contact.editor.note)}</p>
      </article>
      <article class="contact-card">
        <span class="contact-card__label">${text(contact.sponsor.label)}</span>
        <a href="mailto:${text(contact.sponsor.value)}">${text(contact.sponsor.value)}</a>
        <p>${text(contact.sponsor.note)}</p>
      </article>
    </section>
    <section class="social-panel">
      <h2>${text(contact.socialTitle)}</h2>
      <div class="social-grid social-grid--wide">
        ${renderSocialChips(localeKey)}
      </div>
      <p>${text(contact.response)}</p>
    </section>
  </main>`;
}

function renderSponsor(localeKey) {
  const locale = locales[localeKey];
  const sponsor = locale.sponsor;
  return `
  <main id="content" class="page page-detail">
    <section class="page-hero">
      <p class="eyebrow">${text(locale.nav.sponsor)}</p>
      <h1>${text(sponsor.title)}</h1>
      <p class="lede">${text(sponsor.lead)}</p>
    </section>
    <section class="package-grid">
      ${sponsor.packages
        .map(
          (item) => `
        <article class="package-card">
          <p class="package-card__eyebrow">${text(item.name)}</p>
          <h2>${text(item.title)}</h2>
          <p>${text(item.description)}</p>
          <dl class="package-card__dl">
            ${item.rows
              .map(
                ([label, value]) => `
              <div>
                <dt>${text(label)}</dt>
                <dd>${text(value)}</dd>
              </div>`,
              )
              .join("")}
          </dl>
        </article>`,
        )
        .join("")}
    </section>
    <section class="closing-panel closing-panel--support">
      <p>${text(sponsor.note)}</p>
    </section>
  </main>`;
}

function renderLineup(localeKey, currentFile) {
  const locale = locales[localeKey];
  const lineup = locale.lineup;
  const applyHref = "mailto:editor@alomat.uz";
  const featuredArticle = getLineupArticleById("fable-5");
  const listArticle = getLineupArticleById("attention");
  const featuredHref = relativeHref(currentFile, lineupArticleOutputPath(localeKey, featuredArticle));
  const listArticleHref = relativeHref(currentFile, lineupArticleOutputPath(localeKey, listArticle));
  const labels =
    localeKey === "en"
      ? {
          writings: "Writings",
          sectionAll: "See all →",
          staff: "Masthead",
          staffMeta: "Each one by editor invitation",
          category: "Politics",
          read: "Read →",
        }
      : localeKey === "tr"
        ? {
            writings: "Yaz\u0131lar",
            sectionAll: "T\u00fcm\u00fcn\u00fc g\u00f6r →",
            staff: "Yazarlar",
            staffMeta: "Her yazar edit\u00f6r davetiyle",
            category: "Siyaset",
            read: "Oku →",
          }
        : {
          writings: "Yozuvlar",
          sectionAll: "Barchasini ko‘rish →",
          staff: "Mualliflar",
          staffMeta: "Har bir muallif tahririyat taklifi bilan",
          category: "Siyosat",
          read: "O‘qish →",
        };
  const featureImage =
    "https://cdn1.wiro.ai/94ba0b39-504e320f-0b1a182a-a37a2a0c-e28daf4a-1ff0d4d9-a30cfff8-0bff6445-26581401-464e6371-181d8a7c-effaf4d5/2212310_Image.png";
  const articleImage =
    "https://cdn1.wiro.ai/f7c0c2a1-d7a0bdcf-a060f16f-23986f17-d3617ce3-0ce7a132-2cc2a246-28880a97-03a40838-a420fa9d-850c160f-71a17c6d/1867404_Image.png";
  return `
  <div id="content" class="lineup-page">
    <main class="lineup-shell">
      <section class="lineup-cover">
        <p class="lineup-epigraph">${text(lineup.lead)}</p>
        <a class="lineup-feature lineup-feature--cover" href="${text(featuredHref)}">
          <div class="lineup-feature__cover lineup-cover-duo">
            <img alt="${text(lineup.featured.title)}" src="${text(featureImage)}" loading="lazy" />
          </div>
          <div class="lineup-feature__body">
            <span class="lineup-card__kicker">${text(labels.category)}</span>
            <h1 class="lineup-feature__title">${text(lineup.featured.title)}</h1>
            <p class="lineup-feature__excerpt">${text(lineup.featured.summary)}</p>
            <span class="lineup-card__meta">${text(lineup.featured.author)} · ${text(lineup.featured.date)} · ${text(lineup.featured.readTime)}</span>
            <span class="lineup-feature__cta">${text(labels.read)}</span>
          </div>
        </a>
      </section>
      <section id="lineup-articles" class="lineup-section">
        <div class="lineup-section__head">
          <span class="lineup-kicker lineup-kicker--signal">${text(labels.writings)}</span>
          <a class="lineup-section__meta" href="#lineup-articles">${text(labels.sectionAll)}</a>
        </div>
        <div class="lineup-cards">
          ${lineup.articles
            .map(
              (article) => `
          <a class="lineup-card" href="${text(listArticleHref)}">
            <div class="lineup-card__cover lineup-cover-duo">
              <img alt="${text(article.title)}" src="${text(articleImage)}" loading="lazy" />
            </div>
            <div class="lineup-card__body">
              <span class="lineup-card__kicker">AI</span>
              <h3 class="lineup-card__title">${text(article.title)}</h3>
              <span class="lineup-card__meta">${text(article.author)} · ${text(article.date)}</span>
            </div>
          </a>`,
            )
            .join("")}
        </div>
      </section>
      <section class="lineup-section">
        <div class="lineup-section__head">
          <span class="lineup-kicker">${text(labels.staff)}</span>
          <span class="lineup-section__meta">${text(labels.staffMeta)}</span>
        </div>
        <div class="lineup-masthead lineup-masthead--empty">
          <p>${text({ en: "The masthead will open here soon.", uz: "Mualliflar ro‘yxati tez orada shu yerda e’lon qilinadi.", tr: "Yazar listesi yak\u0131nda burada a\u00e7\u0131lacak." }[localeKey])}</p>
        </div>
      </section>
      <section class="lineup-cta-row">
        <p class="lineup-cta-row__copy">${text(lineup.ctaNote)}</p>
        <a class="lineup-cta-pill" href="${text(applyHref)}">${text(lineup.cta)} →</a>
      </section>
    </main>
  </div>`;
}

function renderLineupArticle(localeKey, currentFile, article) {
  const locale = locales[localeKey];
  const lineupHref = relativeHref(currentFile, navigationPageOutputPath(localeKey, "lineup"));
  const author = locale.lineup.authors.find((entry) => entry.initials === article.author.initials) ?? locale.lineup.authors[0];
  const labels =
    localeKey === "en"
      ? {
          writtenBy: "Written by",
          allPosts: "All writings",
          back: "← Lineup",
          smaller: "Make text smaller",
          larger: "Make text larger",
          share: "Share",
        }
      : localeKey === "tr"
        ? {
            writtenBy: "Yazan",
            allPosts: "T\u00fcm yaz\u0131lar",
            back: "← LINEUP",
            smaller: "Metni k\u00fc\u00e7\u00fclt",
            larger: "Metni b\u00fcy\u00fct",
            share: "Payla\u015f",
          }
        : {
          writtenBy: "Muallif",
          allPosts: "Barcha yozuvlar",
          back: "← Lineup",
          smaller: "Matnni kichraytirish",
          larger: "Matnni kattalashtirish",
          share: "Ulashish",
        };

  return `
  <div id="content" class="lineup-page">
    <main class="lineup-shell">
      <article class="lineup-article">
        <div class="lineup-article-body">
          <header class="lineup-article-head">
            <div class="lineup-article-head__folio">
              <span class="lineup-kicker lineup-kicker--signal">${text(localizeStoryValue(article.category, localeKey))}</span>
              <span class="lineup-article-head__date">${text(localizeStoryValue(article.date, localeKey))}</span>
            </div>
            <h1 class="lineup-article-title">${text(localizeStoryValue(article.title, localeKey))}</h1>
            <div class="lineup-article-head__byline">
              <span class="lineup-byline__avatar"><span>${text(article.author.initials)}</span></span>
              <span class="lineup-byline__name">${text(article.author.name)}</span>
              <span class="lineup-article-head__read">${text(localizeStoryValue(article.readTime, localeKey))}</span>
            </div>
          </header>
          <div class="lineup-article-cover">
            <img src="${text(article.image)}" alt="${text(localizeStoryValue(article.title, localeKey))}" loading="lazy" />
          </div>
          <div class="lineup-reading-wrap">
            <div class="lineup-reading">
              ${article.body[localeKey].map((paragraph) => `<p>${text(paragraph)}</p>`).join("")}
            </div>
          </div>
          <div class="lineup-article-end" aria-hidden="true"></div>
        </div>
      </article>
      <section class="lineup-section lineup-section--author">
        <div class="lineup-section__head">
          <span class="lineup-kicker">${text(labels.writtenBy)}</span>
        </div>
        <div class="lineup-author-card">
          <span class="lineup-avatar"><span>${text(author.initials)}</span></span>
          <div class="lineup-author-card__text">
            <p class="lineup-author-card__name">${text(author.name)}</p>
            <p class="lineup-author-card__bio">${text(author.role)}</p>
            <a class="lineup-author-card__more" href="${text(lineupHref)}">${text(labels.allPosts)}<span aria-hidden="true">→</span></a>
          </div>
        </div>
        <p class="lineup-back-row"><a class="lineup-cta-pill lineup-cta-pill--ghost" href="${text(lineupHref)}">${text(labels.back)}</a></p>
      </section>
    </main>
  </div>`;
}

function renderPrivacy(localeKey) {
  const locale = locales[localeKey];
  const privacy = locale.privacy;
  return `
  <main id="content" class="page page-detail">
    <section class="page-hero">
      <p class="eyebrow">${text(locale.nav.privacy)}</p>
      <h1>${text(privacy.title)}</h1>
      <p class="lede">${text(privacy.lead)}</p>
    </section>
    <section class="policy-grid">
      ${privacy.sections
        .map(
          (section) => `
        <article class="policy-card">
          <h2>${text(section.title)}</h2>
          ${section.paragraphs.map((paragraph) => `<p>${text(paragraph)}</p>`).join("")}
          ${section.bullets ? renderList(section.bullets) : ""}
        </article>`,
        )
        .join("")}
    </section>
    <section class="closing-panel">
      <p>${text(privacy.closing)}</p>
    </section>
  </main>`;
}

function renderPage(localeKey, pageKey, currentFile) {
  switch (pageKey) {
    case "home":
      return renderHome(localeKey, currentFile);
    case "about":
      return renderAbout(localeKey, currentFile);
    case "library":
      return renderLibrary(localeKey, currentFile);
    case "relay":
      return renderRelay(localeKey);
    case "contact":
      return renderContact(localeKey);
    case "sponsor":
      return renderSponsor(localeKey);
    case "lineup":
      return renderLineup(localeKey, currentFile);
    case "privacy":
      return renderPrivacy(localeKey);
    default:
      throw new Error(`Unknown page: ${pageKey}`);
  }
}

function renderInlineStyles() {
  return `<style data-alomat-styles>
${inlineStyles}
    </style>`;
}

function renderInlineApp() {
  return `<script data-alomat-app>
${inlineApp}
    </script>`;
}

function renderDocument(localeKey, pageKey, outputFile = pageOutputPath(localeKey, pageKey)) {
  const locale = locales[localeKey];
  const pageMeta = pages.find((entry) => entry.key === pageKey);
  const currentFile = outputFile;
  const localeOutputPath = (targetLocaleKey) => navigationPageOutputPath(targetLocaleKey, pageKey);
  const currentLocaleHref = relativeHref(currentFile, currentFile);
  const skipSiteFooter = pageKey === "about";

  return `<!doctype html>
<html lang="${text(locale.htmlLang)}" data-locale="${text(localeKey)}" data-page="${text(pageKey)}" data-palette="2" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${text(pageMeta.title[localeKey])}</title>
    <meta name="description" content="${text(pageMeta.description[localeKey])}" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='44' fill='%23ff7a59'/%3E%3Cpath d='M20 50h60' stroke='%230b0d0f' stroke-width='10' stroke-linecap='round'/%3E%3C/svg%3E" />
    ${renderInlineStyles()}
    ${renderThemeBootScript()}
    <style>
      html[data-page="home"] .signal-reader-gate .eyebrow {
        display: inline-block;
        width: fit-content;
        margin-bottom: 0;
        font-size: 0.62rem;
        line-height: 1.05;
        letter-spacing: 0.18em;
      }

      html[data-page="home"][data-locale] .signal-reader-gate h1 {
        margin-top: 0;
        margin-bottom: 0;
        font-size: clamp(2.05rem, 2.5vw, 2.25rem);
        line-height: 0.88;
        min-width: var(--home-gate-title-width, 361px);
        min-height: 0;
      }

      html[data-page="home"] .signal-reader-gate .lede {
        width: min(314px, calc(var(--home-gate-title-width, 361px) - 24px));
        max-width: min(314px, calc(var(--home-gate-title-width, 361px) - 24px));
        margin-top: 6px;
        font-size: 0.78rem;
        line-height: 1.45;
        display: block;
        overflow: hidden;
        min-height: calc(1.45em * 2);
      }

      html[data-page="home"] .signal-reader-gate__content {
        transform: translateY(-10px);
      }

      html[data-page="home"] .signal-reader-gate__action {
        transform: translateY(-10px);
      }

      html[data-page="home"] .signal-reader-gate {
        margin-left: var(--home-gate-margin-left, 118px);
      }

      html[data-page="home"] .signal-timeline__item {
        min-height: var(--home-row-min-height, 243px);
      }

      html[data-page="home"] .signal-timeline__day-marker {
        min-height: 72px;
      }

      html[data-page="home"] .signal-timeline__day-marker::before {
        width: var(--home-rail-left, 160.69px);
      }

      html[data-page="home"] .signal-timeline__headline-text {
        font-size: 1.420rem;
        line-height: 0.98;
      }

      html[data-page="home"] .signal-detail {
        top: var(--home-detail-top, 108px);
        right: var(--home-detail-right, 36px);
        width: var(--home-detail-width, 420px);
        height: var(--home-detail-height, min(946px, calc(100vh - 128px)));
      }

      html[data-page="home"] .signal-detail.has-story .signal-detail__content {
        gap: 8px;
        grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;
        overflow-y: hidden;
      }

      html[data-page="home"] .timeline-panel__hero-top {
        position: relative;
        min-height: 21px;
      }

      html[data-page="home"] .timeline-panel__close {
        position: absolute;
        top: -5px;
        right: -2px;
      }

      html[data-page="home"] .timeline-panel__hero h2 {
        margin-top: 6px;
        max-width: 100%;
        font-size: 1.18rem;
        line-height: 1.03;
        letter-spacing: 0;
      }

      html[data-page="home"] .timeline-panel__body {
        min-height: 0;
        max-height: none;
        margin-top: 0;
        overflow: auto;
        scrollbar-width: thin;
        color: rgba(5, 7, 13, 0.96);
        font-size: 1.02rem;
        line-height: 1.5;
      }

      @media (max-width: 780px) {
        html[data-page="home"] .topbar--home .nav--home {
          flex-wrap: nowrap;
          scrollbar-width: none;
          padding: 0 6px;
        }

        html[data-page="home"] .topbar--home .nav--home::-webkit-scrollbar {
          display: none;
        }

        html[data-page="home"] .topbar--home .nav__item {
          gap: 5px;
          padding: 0 6px;
          font-size: 0.56rem;
          letter-spacing: 0.09em;
        }

        html[data-page="home"] .signal-reader-gate {
          grid-template-columns: 56px minmax(0, 1fr);
          gap: 16px;
          margin-left: 0;
          padding-top: 24px;
          max-width: 100%;
          min-height: 0;
          height: auto;
        }

        html[data-page="home"] .signal-reader-gate__content,
        html[data-page="home"] .signal-reader-gate__action {
          transform: none;
        }

        html[data-page="home"][data-locale] .signal-reader-gate h1 {
          font-size: clamp(2.8rem, 14vw, 4.8rem);
          line-height: 0.92;
          min-width: 0;
        }

        html[data-page="home"] .signal-reader-gate .lede {
          width: auto;
          max-width: none;
          min-height: 0;
          font-size: 0.92rem;
        }

        html[data-page="home"] .signal-reader-gate__action {
          grid-column: 1 / -1;
          width: 100%;
          min-height: 44px;
          margin-top: 6px;
        }

        html[data-page="home"] .signal-timeline--home {
          padding-bottom: 24px;
        }

        html[data-page="home"] .signal-timeline__day-marker {
          margin-left: 0;
          min-height: 0;
          padding-left: 44px;
        }

        html[data-page="home"] .signal-timeline__day-marker::before {
          width: 0;
        }

        html[data-page="home"] .signal-timeline__item {
          min-height: 164px;
        }

        html[data-page="home"] .signal-timeline__headline-text {
          font-size: clamp(1.02rem, 4.4vw, 1.2rem);
        }

        html[data-page="home"] .signal-detail {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          top: auto;
          width: 100%;
          max-height: 54vh;
          height: auto;
          min-height: 0;
          margin: 0;
          border-radius: 20px 20px 0 0;
          z-index: 320;
          box-shadow: 0 -18px 50px rgba(5, 7, 13, 0.28);
          background: var(--bg);
          transform: translateY(calc(100% + 28px));
          pointer-events: none;
          transition: transform 220ms ease;
        }

        html[data-page="home"] .signal-detail__visual {
          display: none;
          opacity: 0;
          background-image: none;
        }

        html[data-page="home"] .signal-timeline__headline-button::after,
        html[data-page="home"] .signal-timeline__item.is-active .signal-timeline__headline-button::after {
          background-image: none;
          opacity: 0;
        }

        html[data-page="home"] .signal-detail__content {
          max-height: inherit;
          height: auto;
        }

        html[data-page="home"] .signal-detail.has-story .signal-detail__content {
          display: flex;
          overflow-y: auto;
        }

        html[data-page="home"] .signal-detail.has-story .timeline-panel__close {
          display: grid;
          z-index: 4;
        }

        html[data-page="home"] .signal-detail__content h2 {
          font-size: clamp(1.7rem, 8.5vw, 2rem);
          line-height: 1;
          overflow-wrap: break-word;
        }

        html[data-page="home"] .page-home.has-detail-open .signal-detail {
          max-height: 62vh;
          transform: translateY(0);
          pointer-events: auto;
        }
      }
    </style>
    ${renderAlternateLinks(localeKey, currentFile, localeOutputPath)}
    <link rel="canonical" href="${text(currentLocaleHref)}" />
  </head>
  <body>
    <div class="page-backdrop"></div>
    <div class="page-shell${["home", "library", "about", "lineup"].includes(pageKey) ? " page-shell--home" : ""}">
      ${renderHeader(localeKey, pageKey, currentFile, localeOutputPath).trim()}
      ${renderPage(localeKey, pageKey, currentFile).trim()}
      ${skipSiteFooter ? "" : renderFooter(localeKey, pageKey, currentFile).trim()}
    </div>
    <script>window.__ALOMAT_SIGNALS_API_BASE__=${serializeJson(process.env.ALOMAT_SIGNALS_API_BASE ?? "")};</script>
    ${renderInlineApp()}
  </body>
</html>`;
}

function renderLineupArticleDocument(localeKey, article) {
  const currentFile = lineupArticleOutputPath(localeKey, article);
  const localeOutputPath = (targetLocaleKey) => lineupArticleOutputPath(targetLocaleKey, article);
  const title = `${localizeStoryValue(article.title, localeKey)} | .alomat Lineup`;
  const description = article.body[localeKey][0];

  return `<!doctype html>
<html lang="${text(locales[localeKey].htmlLang)}" data-locale="${text(localeKey)}" data-page="lineup-article" data-palette="2" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${text(title)}</title>
    <meta name="description" content="${text(description)}" />
    <meta name="theme-color" content="#efeff2" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='44' fill='%23ff7a59'/%3E%3Cpath d='M20 50h60' stroke='%230b0d0f' stroke-width='10' stroke-linecap='round'/%3E%3C/svg%3E" />
    ${renderInlineStyles()}
    ${renderThemeBootScript()}
    ${renderAlternateLinks(localeKey, currentFile, localeOutputPath)}
  </head>
  <body>
    <div class="page-backdrop"></div>
    <div class="page-shell page-shell--home">
      ${renderHeader(localeKey, "lineup", currentFile, localeOutputPath).trim()}
      ${renderLineupArticle(localeKey, currentFile, article)}
      ${renderFooter(localeKey, "lineup", currentFile)}
    </div>
    ${renderInlineApp()}
  </body>
</html>`;
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function buildSite() {
  await rm(outputRoot, { recursive: true, force: true });
  await ensureDir(assetRoot);

  await copyFile(path.join(sourceRoot, "styles.css"), path.join(assetRoot, "styles.css"));
  await copyFile(path.join(sourceRoot, "app.js"), path.join(assetRoot, "app.js"));
  await copyFile(path.join(sourceRoot, "styles.css"), path.join(assetRoot, versionedStylesFile));
  await copyFile(path.join(sourceRoot, "app.js"), path.join(assetRoot, versionedAppFile));

  for (const localeKey of Object.keys(locales)) {
    for (const page of pages) {
      const outputFile = pageOutputPath(localeKey, page.key);
      await ensureDir(path.dirname(outputFile));
      await writeFile(outputFile, cleanGeneratedHtml(renderDocument(localeKey, page.key)), "utf8");

      if (page.key === "home" || page.key === "about" || page.key === "lineup") {
        const fallbackFile = navigationPageOutputPath(localeKey, page.key);
        if (fallbackFile !== outputFile) {
          await ensureDir(path.dirname(fallbackFile));
          await writeFile(fallbackFile, cleanGeneratedHtml(renderDocument(localeKey, page.key, fallbackFile)), "utf8");
        }
      }
    }

    for (const article of lineupArticleDetails) {
      const outputFile = lineupArticleOutputPath(localeKey, article);
      await ensureDir(path.dirname(outputFile));
      await writeFile(outputFile, cleanGeneratedHtml(renderLineupArticleDocument(localeKey, article)), "utf8");
    }
  }

  const robots = `User-agent: *\nAllow: /\n`;
  await writeFile(path.join(outputRoot, "robots.txt"), robots, "utf8");
}

buildSite().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
