/**
 * Demo seed content for Seven Wonders Hotel Petra.
 *
 * Facts marked "verified" come from https://www.sevenwondershotel.com (official website, read 2026-10-08).
 * Room category names, rates, rate plans, extras, seasons, taxes and cancellation terms are
 * FICTIONAL DEMO ASSUMPTIONS created by BAYNARI for this presentation and must be confirmed by the hotel.
 */

export const HOTEL_SETTINGS = {
  nameEn: "Seven Wonders Hotel Petra",
  nameAr: "فندق عجائب الدنيا السبع - البتراء",
  taglineEn: "A rooftop above the valley of Petra",
  taglineAr: "سطحٌ يطلّ على وادي البتراء",
  addressEn: "Main Street, opposite the Police Station, Wadi Musa, Petra",
  addressAr: "الشارع الرئيسي، مقابل مركز الشرطة، وادي موسى، البتراء",
  city: "Wadi Musa",
  country: "Jordan",
  postalBox: "P.O. Box 212, Petra 71810",
  phone: "+962 3 2155 156",
  phoneSecondary: "+962 79 822 6659",
  fax: "+962 3 2155 155",
  email: "reservations@sevenwondershotel.com",
  whatsapp: null as string | null, // No verified WhatsApp contact published on the official website.
  latitude: "30.318630",
  longitude: "35.482125",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  currency: "JOD",
  facebookUrl: "https://www.facebook.com/sevenwondershotel",
  tripadvisorUrl: null as string | null,
  instagramUrl: null as string | null,
};

export const AMENITIES = [
  { key: "wifi", labelEn: "High-speed Wi-Fi", labelAr: "واي فاي عالي السرعة", icon: "wifi", category: "room" },
  { key: "ac", labelEn: "Air conditioning & heating", labelAr: "تكييف وتدفئة", icon: "thermometer", category: "room" },
  { key: "tv", labelEn: "Satellite LCD television", labelAr: "تلفاز LCD بقنوات فضائية", icon: "tv", category: "room" },
  { key: "fridge", labelEn: "Refrigerator", labelAr: "ثلاجة", icon: "refrigerator", category: "room" },
  { key: "safe", labelEn: "In-room safety box", labelAr: "خزنة داخل الغرفة", icon: "lock", category: "room" },
  { key: "hairdryer", labelEn: "Hairdryer", labelAr: "مجفف شعر", icon: "wind", category: "room" },
  { key: "iron", labelEn: "Iron & board on request", labelAr: "مكواة وطاولة كي عند الطلب", icon: "shirt", category: "room" },
  { key: "shower", labelEn: "Private bathroom with shower", labelAr: "حمام خاص مع دش", icon: "shower-head", category: "room" },
  { key: "balcony", labelEn: "Private balcony with seating", labelAr: "شرفة خاصة مع جلسة", icon: "sun", category: "room" },
  { key: "cityview", labelEn: "Wadi Musa city view", labelAr: "إطلالة على مدينة وادي موسى", icon: "mountain", category: "room" },
  { key: "lounge", labelEn: "Separate seating area", labelAr: "منطقة جلوس منفصلة", icon: "sofa", category: "room" },
  { key: "cot", labelEn: "Baby cot on request", labelAr: "سرير أطفال عند الطلب", icon: "baby", category: "room" },
] as const;

export type RoomTypeSeed = {
  code: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bedConfigEn: string;
  bedConfigAr: string;
  sizeSqm: number;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  baseRate: string;
  weekendRate: string;
  highSeasonRate: string;
  extraAdultRate: string;
  extraChildRate: string;
  isSuite: boolean;
  isFeatured: boolean;
  roomCount: number;
  balconyCount: number;
  floors: number[];
  amenities: string[];
  images: Array<{ file: string; altEn: string; altAr: string }>;
};

/** Demo room categories derived from the verified room mix (38 rooms incl. 3 suites, single/triple/4-bed rooms, 27 balconies). */
export const ROOM_TYPES: RoomTypeSeed[] = [
  {
    code: "SGL",
    slug: "classic-single",
    nameEn: "Classic Single",
    nameAr: "غرفة مفردة كلاسيكية",
    shortEn: "A quiet, well-proportioned room for the solo traveller.",
    shortAr: "غرفة هادئة بمساحة مريحة للمسافر المنفرد.",
    descriptionEn:
      "Designed for guests who value quiet and privacy, the Classic Single offers a comfortable single bed, a writing corner and a private shower room. All rooms enjoy high-speed Wi-Fi, satellite television, air conditioning, a refrigerator and a safety box.",
    descriptionAr:
      "صُمّمت الغرفة المفردة الكلاسيكية للضيوف الذين يقدّرون الهدوء والخصوصية، وتضم سريراً مفرداً مريحاً وركن كتابة وحماماً خاصاً مع دش. تتوفر في جميع الغرف شبكة واي فاي عالية السرعة وتلفاز فضائي وتكييف وثلاجة وخزنة.",
    bedConfigEn: "1 single bed",
    bedConfigAr: "سرير مفرد واحد",
    sizeSqm: 16,
    maxAdults: 1,
    maxChildren: 0,
    maxOccupancy: 1,
    baseRate: "45.00",
    weekendRate: "50.00",
    highSeasonRate: "55.00",
    extraAdultRate: "0.00",
    extraChildRate: "0.00",
    isSuite: false,
    isFeatured: false,
    roomCount: 4,
    balconyCount: 0,
    floors: [1, 2],
    amenities: ["wifi", "ac", "tv", "fridge", "safe", "hairdryer", "iron", "shower"],
    images: [
      { file: "room-double-window.webp", altEn: "Classic room with window and seating corner", altAr: "غرفة كلاسيكية مع نافذة وركن جلوس" },
      { file: "room-tv-desk.webp", altEn: "In-room television and desk", altAr: "تلفاز ومكتب داخل الغرفة" },
    ],
  },
  {
    code: "DBL",
    slug: "deluxe-double",
    nameEn: "Deluxe Double",
    nameAr: "غرفة مزدوجة ديلوكس",
    shortEn: "Warm sandstone tones, a queen bed and views over Wadi Musa.",
    shortAr: "ألوان رملية دافئة وسرير كبير وإطلالة على وادي موسى.",
    descriptionEn:
      "The Deluxe Double is the heart of the hotel: a generous bedroom finished in warm tones with a queen bed, seating area and a private bathroom. Most Deluxe Doubles open onto a furnished balcony overlooking the town and valley of Wadi Musa.",
    descriptionAr:
      "الغرفة المزدوجة ديلوكس هي قلب الفندق: غرفة نوم رحبة بألوان دافئة مع سرير كبير ومنطقة جلوس وحمام خاص. تطل معظم الغرف المزدوجة على شرفة مفروشة تشرف على بلدة ووادي موسى.",
    bedConfigEn: "1 queen bed",
    bedConfigAr: "سرير كوين واحد",
    sizeSqm: 24,
    maxAdults: 2,
    maxChildren: 1,
    maxOccupancy: 3,
    baseRate: "65.00",
    weekendRate: "72.00",
    highSeasonRate: "82.00",
    extraAdultRate: "0.00",
    extraChildRate: "10.00",
    isSuite: false,
    isFeatured: true,
    roomCount: 12,
    balconyCount: 10,
    floors: [2, 3, 4],
    amenities: ["wifi", "ac", "tv", "fridge", "safe", "hairdryer", "iron", "shower", "balcony", "cityview", "cot"],
    images: [
      { file: "double-room-warm.webp", altEn: "Deluxe Double room with queen bed and warm lighting", altAr: "غرفة مزدوجة ديلوكس بسرير كبير وإضاءة دافئة" },
      { file: "room-double-window.webp", altEn: "Double room with seating corner by the window", altAr: "غرفة مزدوجة مع ركن جلوس بجانب النافذة" },
      { file: "room-tv-desk.webp", altEn: "Television, desk and minibar", altAr: "تلفاز ومكتب وثلاجة صغيرة" },
    ],
  },
  {
    code: "TWN",
    slug: "twin-balcony",
    nameEn: "Twin Room with Balcony",
    nameAr: "غرفة توأم مع شرفة",
    shortEn: "Two single beds and a furnished balcony for friends on the road.",
    shortAr: "سريران مفردان وشرفة مفروشة للأصدقاء في رحلتهم.",
    descriptionEn:
      "Two single beds, a reading lamp each and a private balcony with seating make the Twin Room ideal for friends or colleagues travelling together. Blackout curtains, air conditioning and heating keep the room comfortable in every season.",
    descriptionAr:
      "سريران مفردان ومصباح قراءة لكل منهما وشرفة خاصة مع جلسة تجعل غرفة التوأم مثالية للأصدقاء أو الزملاء المسافرين معاً. ستائر معتمة وتكييف وتدفئة تحافظ على راحة الغرفة في كل فصول السنة.",
    bedConfigEn: "2 single beds",
    bedConfigAr: "سريران مفردان",
    sizeSqm: 24,
    maxAdults: 2,
    maxChildren: 1,
    maxOccupancy: 3,
    baseRate: "65.00",
    weekendRate: "72.00",
    highSeasonRate: "82.00",
    extraAdultRate: "0.00",
    extraChildRate: "10.00",
    isSuite: false,
    isFeatured: false,
    roomCount: 8,
    balconyCount: 6,
    floors: [2, 3],
    amenities: ["wifi", "ac", "tv", "fridge", "safe", "hairdryer", "iron", "shower", "balcony", "cityview"],
    images: [
      { file: "twin-room-balcony-curtains.webp", altEn: "Twin room with balcony curtains and seating", altAr: "غرفة توأم مع ستائر الشرفة وجلسة" },
      { file: "twin-beds-detail.webp", altEn: "Twin beds with cushions", altAr: "سريران مفردان مع وسائد" },
    ],
  },
  {
    code: "TRP",
    slug: "family-triple",
    nameEn: "Family Triple",
    nameAr: "غرفة عائلية ثلاثية",
    shortEn: "Three single beds so families and small groups stay together.",
    shortAr: "ثلاثة أسرّة مفردة لتبقى العائلات والمجموعات الصغيرة معاً.",
    descriptionEn:
      "The Family Triple has three full single beds, so nobody has to split up on arrival. A spacious layout, balcony on most rooms and the hotel's lift make it an easy choice for families visiting Petra.",
    descriptionAr:
      "تضم الغرفة العائلية الثلاثية ثلاثة أسرّة مفردة كاملة حتى لا يضطر أحد للانفصال عند الوصول. تصميم فسيح وشرفة في معظم الغرف ومصعد في الفندق تجعلها خياراً سهلاً للعائلات التي تزور البتراء.",
    bedConfigEn: "3 single beds",
    bedConfigAr: "ثلاثة أسرّة مفردة",
    sizeSqm: 28,
    maxAdults: 3,
    maxChildren: 1,
    maxOccupancy: 4,
    baseRate: "85.00",
    weekendRate: "92.00",
    highSeasonRate: "105.00",
    extraAdultRate: "15.00",
    extraChildRate: "10.00",
    isSuite: false,
    isFeatured: true,
    roomCount: 6,
    balconyCount: 5,
    floors: [3, 4],
    amenities: ["wifi", "ac", "tv", "fridge", "safe", "hairdryer", "iron", "shower", "balcony", "cityview", "cot"],
    images: [
      { file: "triple-room.webp", altEn: "Triple room with three single beds", altAr: "غرفة ثلاثية بثلاثة أسرّة مفردة" },
      { file: "quad-room-beds.webp", altEn: "Row of single beds with reading lamps", altAr: "صف من الأسرّة المفردة مع مصابيح قراءة" },
    ],
  },
  {
    code: "QUD",
    slug: "group-quad",
    nameEn: "Group Quad",
    nameAr: "غرفة رباعية للمجموعات",
    shortEn: "Four single beds for friends travelling as a group.",
    shortAr: "أربعة أسرّة مفردة للأصدقاء المسافرين كمجموعة.",
    descriptionEn:
      "Four single beds in one generous room, with a private bathroom, wardrobe space for everyone and the same comforts as every room in the hotel. Popular with hiking groups and students exploring Petra.",
    descriptionAr:
      "أربعة أسرّة مفردة في غرفة واحدة رحبة مع حمام خاص ومساحة خزائن للجميع ونفس وسائل الراحة في كل غرف الفندق. خيار مفضّل لمجموعات المشي والطلاب الذين يستكشفون البتراء.",
    bedConfigEn: "4 single beds",
    bedConfigAr: "أربعة أسرّة مفردة",
    sizeSqm: 32,
    maxAdults: 4,
    maxChildren: 0,
    maxOccupancy: 4,
    baseRate: "105.00",
    weekendRate: "112.00",
    highSeasonRate: "128.00",
    extraAdultRate: "15.00",
    extraChildRate: "0.00",
    isSuite: false,
    isFeatured: false,
    roomCount: 5,
    balconyCount: 3,
    floors: [4, 5],
    amenities: ["wifi", "ac", "tv", "fridge", "safe", "hairdryer", "iron", "shower", "cityview"],
    images: [
      { file: "quad-room-beds.webp", altEn: "Quad room with four single beds", altAr: "غرفة رباعية بأربعة أسرّة مفردة" },
      { file: "triple-room.webp", altEn: "Single beds with towel art", altAr: "أسرّة مفردة مع مناشف مزخرفة" },
    ],
  },
  {
    code: "STE",
    slug: "petra-suite",
    nameEn: "Petra Suite",
    nameAr: "جناح البتراء",
    shortEn: "A separate lounge, a private balcony and the best views in the house.",
    shortAr: "صالة منفصلة وشرفة خاصة وأفضل الإطلالات في الفندق.",
    descriptionEn:
      "One of only three suites in the hotel. The Petra Suite pairs a king bedroom with a separate lounge, a writing desk and a furnished balcony facing the valley. Ideal for honeymooners or families who want extra space after a long day in the ancient city.",
    descriptionAr:
      "واحد من ثلاثة أجنحة فقط في الفندق. يجمع جناح البتراء بين غرفة نوم بسرير كينغ وصالة منفصلة ومكتب كتابة وشرفة مفروشة تواجه الوادي. مثالي للعرسان أو العائلات التي تريد مساحة إضافية بعد يوم طويل في المدينة الأثرية.",
    bedConfigEn: "1 king bed + sofa bed",
    bedConfigAr: "سرير كينغ + أريكة سرير",
    sizeSqm: 42,
    maxAdults: 2,
    maxChildren: 2,
    maxOccupancy: 4,
    baseRate: "140.00",
    weekendRate: "155.00",
    highSeasonRate: "175.00",
    extraAdultRate: "0.00",
    extraChildRate: "12.00",
    isSuite: true,
    isFeatured: true,
    roomCount: 3,
    balconyCount: 3,
    floors: [5, 6],
    amenities: ["wifi", "ac", "tv", "fridge", "safe", "hairdryer", "iron", "shower", "balcony", "cityview", "lounge", "cot"],
    images: [
      { file: "suite-lounge.webp", altEn: "Suite lounge with leather seating and desk", altAr: "صالة الجناح مع جلسة جلدية ومكتب" },
      { file: "double-room-warm.webp", altEn: "Suite bedroom", altAr: "غرفة نوم الجناح" },
      { file: "terrace-evening.webp", altEn: "Evening on the rooftop terrace", altAr: "أمسية على التراس العلوي" },
    ],
  },
];

export const RATE_PLANS = [
  {
    code: "ROOM_ONLY",
    type: "ROOM_ONLY",
    nameEn: "Room Only",
    nameAr: "الغرفة فقط",
    descriptionEn: "Our standard rate. Breakfast can be added at the hotel.",
    descriptionAr: "سعرنا الأساسي. يمكن إضافة الإفطار في الفندق.",
    adjustmentType: "PERCENT",
    adjustmentValue: "0",
    includesBreakfast: false,
    refundable: true,
    cancellationDeadlineDays: 2,
    cancellationPolicyEn: "Free cancellation up to 2 days before arrival. Later cancellations or no-shows are charged the first night.",
    cancellationPolicyAr: "إلغاء مجاني حتى يومين قبل الوصول. يُحتسب سعر الليلة الأولى عند الإلغاء المتأخر أو عدم الحضور.",
    minNights: 1,
    sortOrder: 1,
  },
  {
    code: "BB",
    type: "BED_AND_BREAKFAST",
    nameEn: "Bed & Breakfast",
    nameAr: "إقامة مع إفطار",
    descriptionEn: "Includes the Al Babour breakfast buffet for all guests in the room, served 06:30 to 10:30.",
    descriptionAr: "يشمل بوفيه الإفطار في مطعم البابور لجميع ضيوف الغرفة، من 06:30 إلى 10:30.",
    adjustmentType: "FIXED",
    adjustmentValue: "12",
    includesBreakfast: true,
    refundable: true,
    cancellationDeadlineDays: 2,
    cancellationPolicyEn: "Free cancellation up to 2 days before arrival. Later cancellations or no-shows are charged the first night.",
    cancellationPolicyAr: "إلغاء مجاني حتى يومين قبل الوصول. يُحتسب سعر الليلة الأولى عند الإلغاء المتأخر أو عدم الحضور.",
    minNights: 1,
    sortOrder: 2,
  },
  {
    code: "FLEX",
    type: "FLEXIBLE",
    nameEn: "Flexible Stay",
    nameAr: "إقامة مرنة",
    descriptionEn: "Change or cancel free of charge until 18:00 on the day of arrival. Breakfast included.",
    descriptionAr: "عدّل أو ألغِ مجاناً حتى الساعة 18:00 من يوم الوصول. الإفطار مشمول.",
    adjustmentType: "PERCENT",
    adjustmentValue: "15",
    includesBreakfast: true,
    refundable: true,
    cancellationDeadlineDays: 0,
    cancellationPolicyEn: "Free cancellation until 18:00 local time on the day of arrival. No-shows are charged the first night.",
    cancellationPolicyAr: "إلغاء مجاني حتى الساعة 18:00 بالتوقيت المحلي من يوم الوصول. يُحتسب سعر الليلة الأولى في حال عدم الحضور.",
    minNights: 1,
    sortOrder: 3,
  },
  {
    code: "NRF",
    type: "NON_REFUNDABLE",
    nameEn: "Non-Refundable Saver",
    nameAr: "سعر التوفير غير القابل للاسترداد",
    descriptionEn: "Our lowest rate. Payment is due at booking and the stay cannot be changed or refunded.",
    descriptionAr: "أقل أسعارنا. يُستحق الدفع عند الحجز ولا يمكن تعديل الإقامة أو استرداد المبلغ.",
    adjustmentType: "PERCENT",
    adjustmentValue: "-12",
    includesBreakfast: false,
    refundable: false,
    cancellationDeadlineDays: 0,
    cancellationPolicyEn: "Non-refundable. The full amount is charged at booking and cannot be refunded or transferred.",
    cancellationPolicyAr: "غير قابل للاسترداد. يُحتسب المبلغ الكامل عند الحجز ولا يمكن استرداده أو تحويله.",
    minNights: 1,
    sortOrder: 4,
  },
  {
    code: "PETRA3",
    type: "PROMOTIONAL",
    nameEn: "Petra Explorer (3+ nights)",
    nameAr: "مستكشف البتراء (3 ليالٍ فأكثر)",
    descriptionEn: "Stay three nights or more and save 18%. Breakfast included. Perfect for the two-day Petra ticket.",
    descriptionAr: "أقم ثلاث ليالٍ أو أكثر ووفّر 18%. الإفطار مشمول. مثالي لتذكرة البتراء ليومين.",
    adjustmentType: "PERCENT",
    adjustmentValue: "-18",
    includesBreakfast: true,
    refundable: true,
    cancellationDeadlineDays: 5,
    cancellationPolicyEn: "Free cancellation up to 5 days before arrival. Later cancellations are charged 50% of the stay.",
    cancellationPolicyAr: "إلغاء مجاني حتى 5 أيام قبل الوصول. يُحتسب 50% من قيمة الإقامة عند الإلغاء المتأخر.",
    minNights: 3,
    sortOrder: 5,
  },
] as const;

export const EXTRAS = [
  {
    code: "BREAKFAST",
    nameEn: "Al Babour breakfast buffet",
    nameAr: "بوفيه الإفطار في مطعم البابور",
    descriptionEn: "Hot and cold buffet with unlimited juices, tea and coffee. Per person, per night.",
    descriptionAr: "بوفيه ساخن وبارد مع عصائر وشاي وقهوة بلا حدود. للشخص الواحد في الليلة.",
    price: "6.00",
    pricing: "PER_PERSON_PER_NIGHT",
    isInquiryOnly: false,
    icon: "coffee",
    sortOrder: 1,
  },
  {
    code: "TRANSFER",
    nameEn: "Private transfer from Queen Alia Airport",
    nameAr: "نقل خاص من مطار الملكة علياء",
    descriptionEn: "Door-to-door private car for up to 3 guests, about 3 hours on the Desert Highway. Per stay, one way.",
    descriptionAr: "سيارة خاصة من الباب إلى الباب لثلاثة ضيوف كحد أقصى، نحو 3 ساعات عبر الطريق الصحراوي. للإقامة، اتجاه واحد.",
    price: "95.00",
    pricing: "PER_STAY",
    isInquiryOnly: false,
    icon: "car",
    sortOrder: 2,
  },
  {
    code: "HAMMAM",
    nameEn: "Afra Turkish Bath session",
    nameAr: "جلسة في حمام عفرا التركي",
    descriptionEn: "Steam room, sauna and Jacuzzi with a 30-minute massage. Swimwear required. Per person.",
    descriptionAr: "غرفة بخار وساونا وجاكوزي مع تدليك لمدة 30 دقيقة. يلزم ارتداء ملابس السباحة. للشخص الواحد.",
    price: "25.00",
    pricing: "PER_PERSON",
    isInquiryOnly: false,
    icon: "waves",
    sortOrder: 3,
  },
  {
    code: "LATE_CHECKOUT",
    nameEn: "Late check-out until 16:00",
    nameAr: "مغادرة متأخرة حتى الساعة 16:00",
    descriptionEn: "Keep your room four extra hours after the standard 12:00 check-out, subject to availability.",
    descriptionAr: "احتفظ بغرفتك أربع ساعات إضافية بعد موعد المغادرة الاعتيادي 12:00، حسب التوفر.",
    price: "20.00",
    pricing: "PER_STAY",
    isInquiryOnly: false,
    icon: "clock",
    sortOrder: 4,
  },
  {
    code: "PETRA_TOUR",
    nameEn: "Guided Petra excursion (inquiry)",
    nameAr: "جولة مرشدة في البتراء (طلب استفسار)",
    descriptionEn: "Tell us your dates and we will arrange a licensed guide and tickets. No charge is added to this reservation.",
    descriptionAr: "أخبرنا بتواريخك وسنرتب مرشداً مرخصاً والتذاكر. لا تُضاف أي رسوم إلى هذا الحجز.",
    price: "0.00",
    pricing: "PER_STAY",
    isInquiryOnly: true,
    icon: "map",
    sortOrder: 5,
  },
] as const;

export const SEASONS = [
  { nameEn: "Spring high season", nameAr: "موسم الذروة الربيعي", start: "03-01", end: "06-01" },
  { nameEn: "Autumn high season", nameAr: "موسم الذروة الخريفي", start: "09-15", end: "12-01" },
] as const;

export const PROMOTIONS = [
  { code: "WELCOME10", nameEn: "Welcome 10% off direct bookings", nameAr: "خصم ترحيبي 10% على الحجز المباشر", type: "PERCENT", value: "10", minNights: 2 },
] as const;

export const POLICIES = [
  {
    key: "checkin",
    titleEn: "Check-in and check-out",
    titleAr: "تسجيل الوصول والمغادرة",
    bodyEn: "Check-in from 14:00. Check-out by 12:00 noon. Early arrival and late departure are subject to availability.",
    bodyAr: "تسجيل الوصول من الساعة 14:00، والمغادرة حتى الساعة 12:00 ظهراً. الوصول المبكر والمغادرة المتأخرة حسب التوفر.",
    isVerified: true,
    sortOrder: 1,
  },
  {
    key: "family",
    titleEn: "A family-oriented hotel",
    titleAr: "فندق عائلي",
    bodyEn: "The hotel is a comfortable, family-oriented setting. Alcohol is not served inside the hotel and pets cannot be accommodated.",
    bodyAr: "الفندق بيئة عائلية مريحة. لا تُقدَّم المشروبات الكحولية داخل الفندق ولا يمكن استقبال الحيوانات الأليفة.",
    isVerified: true,
    sortOrder: 2,
  },
  {
    key: "payment",
    titleEn: "Payment",
    titleAr: "الدفع",
    bodyEn: "Cash, Visa and Mastercard are accepted at reception. Other cards are not accepted at present. Money exchange is available at daily rates.",
    bodyAr: "يُقبل الدفع نقداً وببطاقات فيزا وماستركارد في الاستقبال. لا تُقبل البطاقات الأخرى حالياً. تتوفر خدمة صرف العملات بالأسعار اليومية.",
    isVerified: true,
    sortOrder: 3,
  },
  {
    key: "accessibility",
    titleEn: "Accessibility",
    titleAr: "سهولة الوصول",
    bodyEn: "The building has a lift and stairs, making it suitable for elderly guests. Bathrooms are not adapted for wheelchairs or walking aids.",
    bodyAr: "يضم المبنى مصعداً ودرجاً مما يجعله مناسباً لكبار السن. الحمامات غير مهيأة للكراسي المتحركة أو أدوات المشي المساعدة.",
    isVerified: true,
    sortOrder: 4,
  },
  {
    key: "cancellation",
    titleEn: "Cancellation (demo terms)",
    titleAr: "الإلغاء (شروط تجريبية)",
    bodyEn: "Cancellation conditions depend on the selected rate plan and are shown before you confirm. These demo terms require confirmation by the hotel.",
    bodyAr: "تعتمد شروط الإلغاء على خطة السعر المختارة وتُعرض قبل تأكيد الحجز. هذه الشروط التجريبية تتطلب تأكيد الفندق.",
    isVerified: false,
    sortOrder: 5,
  },
  {
    key: "children",
    titleEn: "Children (demo terms)",
    titleAr: "الأطفال (شروط تجريبية)",
    bodyEn: "Children up to 12 years stay in existing beds at a supplement shown in the price breakdown. Baby cots are available on request.",
    bodyAr: "يقيم الأطفال حتى عمر 12 عاماً في الأسرّة الموجودة مقابل رسم إضافي يظهر في تفاصيل السعر. تتوفر أسرّة أطفال عند الطلب.",
    isVerified: false,
    sortOrder: 6,
  },
  {
    key: "pool",
    titleEn: "Rooftop pool",
    titleAr: "المسبح العلوي",
    bodyEn: "The outdoor, unheated rooftop pool (9 m × 4 m, 1.5 m deep) is free for hotel guests and closes at 20:00. Diving is not permitted and children must be supervised.",
    bodyAr: "المسبح العلوي الخارجي غير المدفأ (9 م × 4 م بعمق 1.5 م) مجاني لضيوف الفندق ويُغلق الساعة 20:00. الغطس غير مسموح ويجب مراقبة الأطفال.",
    isVerified: true,
    sortOrder: 7,
  },
] as const;

export const CONTENT_BLOCKS = [
  {
    key: "home.hero",
    page: "home",
    section: "hero",
    titleEn: "Sleep above the valley of Petra",
    titleAr: "نَم فوق وادي البتراء",
    subtitleEn: "Seven Wonders Hotel · Wadi Musa",
    subtitleAr: "فندق عجائب الدنيا السبع · وادي موسى",
    bodyEn: "A rooftop pool, Jordan's finest Turkish baths and 38 rooms with dramatic views over the town that guards the ancient city.",
    bodyAr: "مسبح علوي وأفضل حمّامات تركية في الأردن و38 غرفة بإطلالات ساحرة على البلدة التي تحرس المدينة الأثرية.",
    imageUrl: "/images/petra/petra-treasury-night.webp",
    sortOrder: 1,
  },
  {
    key: "home.intro",
    page: "home",
    section: "intro",
    titleEn: "A newly built hotel at the upper end of Wadi Musa",
    titleAr: "فندق حديث البناء في أعلى وادي موسى",
    subtitleEn: "Our story",
    subtitleAr: "قصتنا",
    bodyEn:
      "Completed in 2012, the Seven Wonders Hotel rises in a tower design above the main street of Wadi Musa, opposite the police station and a short, almost flat walk from the town centre and souk. Our aim is simple: a happy experience of Arabia in a comfortable, family-oriented setting.",
    bodyAr:
      "اكتمل بناء فندق عجائب الدنيا السبع عام 2012 بتصميم برجي يعلو الشارع الرئيسي في وادي موسى، مقابل مركز الشرطة وعلى بعد مسافة قصيرة شبه مستوية سيراً من وسط البلدة والسوق. هدفنا بسيط: تجربة سعيدة من الجزيرة العربية في أجواء عائلية مريحة.",
    imageUrl: "/images/hotel/hotel-exterior-street.webp",
    sortOrder: 2,
  },
  {
    key: "home.pool",
    page: "home",
    section: "pool",
    titleEn: "The rooftop pool and terrace",
    titleAr: "المسبح والتراس العلوي",
    subtitleEn: "Rooftop",
    subtitleAr: "السطح",
    bodyEn:
      "A 9 by 4 metre outdoor pool with wooden decking, sun loungers and a covered terrace where the mountain air cools the evening. Free for guests, open until 20:00.",
    bodyAr:
      "مسبح خارجي بطول 9 أمتار وعرض 4 أمتار مع أرضية خشبية وكراسي استلقاء وتراس مغطى يبرّد فيه هواء الجبل المساء. مجاني للضيوف ومفتوح حتى الساعة 20:00.",
    imageUrl: "/images/hotel/rooftop-pool-night.webp",
    sortOrder: 3,
  },
  {
    key: "home.baths",
    page: "home",
    section: "baths",
    titleEn: "Afra Turkish Baths",
    titleAr: "حمّامات عفرا التركية",
    subtitleEn: "Wellness",
    subtitleAr: "الاسترخاء",
    bodyEn:
      "In the basement of the hotel, what we believe are the largest and best fitted Turkish baths in Jordan: a steam hall built around a marble stone, an authentic sauna, a Jacuzzi, a fitness room and therapeutic massage from a qualified masseur.",
    bodyAr:
      "في الطابق السفلي من الفندق، ما نعتقد أنه أكبر وأفضل حمّامات تركية تجهيزاً في الأردن: قاعة بخار مبنية حول حجر رخامي وساونا أصيلة وجاكوزي وغرفة لياقة وتدليك علاجي على يد مدلّك مؤهل.",
    imageUrl: "/images/hotel/turkish-bath-hall.webp",
    sortOrder: 4,
  },
  {
    key: "home.dining",
    page: "home",
    section: "dining",
    titleEn: "Al Babour Restaurant and the Roof of Wonders",
    titleAr: "مطعم البابور وسطح العجائب",
    subtitleEn: "Dining",
    subtitleAr: "المطاعم",
    bodyEn:
      "Freshly prepared local food at fair prices: a hot and cold breakfast buffet, Arabic and international lunch buffets, an evening à la carte menu and 18-hour room service. The Roof of Wonders serves healthy snacks, fresh juices and hubble-bubble from 16:00 to 22:30.",
    bodyAr:
      "طعام محلي طازج بأسعار عادلة: بوفيه إفطار ساخن وبارد وبوفيهات غداء عربية وعالمية وقائمة مسائية حسب الطلب وخدمة غرف لمدة 18 ساعة. يقدّم سطح العجائب وجبات خفيفة صحية وعصائر طازجة وأرجيلة من الساعة 16:00 حتى 22:30.",
    imageUrl: "/images/hotel/al-babour-restaurant.webp",
    sortOrder: 5,
  },
  {
    key: "home.petra",
    page: "home",
    section: "petra",
    titleEn: "The Rose City is on your doorstep",
    titleAr: "المدينة الوردية على عتبة بابك",
    subtitleEn: "Petra",
    subtitleAr: "البتراء",
    bodyEn:
      "The hotel stands on the same road that runs down through the valley to the Petra visitor centre and the Siq. Walk to the souk, take the Petra by Night candle walk, or ask reception to summon a taxi to Little Petra and the mountain villages.",
    bodyAr:
      "يقع الفندق على الطريق نفسه الذي ينحدر عبر الوادي إلى مركز زوار البتراء والسيق. امشِ إلى السوق، أو انضم إلى جولة البتراء ليلاً على ضوء الشموع، أو اطلب من الاستقبال استدعاء سيارة أجرة إلى البتراء الصغيرة والقرى الجبلية.",
    imageUrl: "/images/petra/petra-siq.webp",
    sortOrder: 6,
  },
  {
    key: "home.location",
    page: "home",
    section: "location",
    titleEn: "Easy to find, easy to reach",
    titleAr: "سهل الوصول والعثور عليه",
    subtitleEn: "Location",
    subtitleAr: "الموقع",
    bodyEn:
      "From Amman or Queen Alia International Airport, follow the Desert Highway south for about 200 km and turn right towards Petra. From Aqaba, drive about 85 km north. The hotel is on the main street, directly opposite the main police station in the city centre.",
    bodyAr:
      "من عمّان أو مطار الملكة علياء الدولي، اتبع الطريق الصحراوي جنوباً نحو 200 كم ثم انعطف يميناً نحو البتراء. ومن العقبة، سِر نحو 85 كم شمالاً. يقع الفندق على الشارع الرئيسي مقابل مركز الشرطة الرئيسي في وسط المدينة مباشرة.",
    imageUrl: null,
    sortOrder: 7,
  },
  {
    key: "about.story",
    page: "about",
    section: "story",
    titleEn: "Honoured to welcome you",
    titleAr: "يشرّفنا أن نرحّب بكم",
    subtitleEn: "About the hotel",
    subtitleAr: "عن الفندق",
    bodyEn:
      "Seven Wonders Hotel is situated with dramatic views over the town and valley of Wadi Musa, which houses the ancient city of Petra, one of the New Seven Wonders of the World. We are a newly built hotel with the super-added facilities of a rooftop swimming pool and terrace, and what we believe is the best fitted Turkish baths suite in Jordan.",
    bodyAr:
      "يتمتع فندق عجائب الدنيا السبع بإطلالات ساحرة على بلدة ووادي موسى الذي يحتضن مدينة البتراء الأثرية، إحدى عجائب الدنيا السبع الجديدة. نحن فندق حديث البناء بمرافق إضافية مميزة تشمل مسبحاً وتراساً علويين وما نعتقد أنه أفضل جناح حمّامات تركية تجهيزاً في الأردن.",
    imageUrl: "/images/hotel/hotel-exterior-rooftop.webp",
    sortOrder: 1,
  },
  {
    key: "about.building",
    page: "about",
    section: "building",
    titleEn: "A tower above the valley",
    titleAr: "برج فوق الوادي",
    subtitleEn: "The building",
    subtitleAr: "المبنى",
    bodyEn:
      "Completed in 2012, the building follows a tower design with a lift and stairs, so it suits elderly and slightly less mobile guests. Thirty-eight city-view rooms, including three suites, occupy the floors above the lobby, and twenty-seven of them have balconies with seating.",
    bodyAr:
      "اكتمل المبنى عام 2012 بتصميم برجي مع مصعد ودرج، ما يجعله مناسباً لكبار السن والضيوف الأقل قدرة على الحركة. تشغل 38 غرفة بإطلالة على المدينة، منها ثلاثة أجنحة، الطوابق فوق البهو، ولسبعٍ وعشرين منها شرفات مع جلسات.",
    imageUrl: "/images/hotel/lobby-lounge.webp",
    sortOrder: 2,
  },
  {
    key: "about.reception",
    page: "about",
    section: "reception",
    titleEn: "Reception, around the clock",
    titleAr: "الاستقبال على مدار الساعة",
    subtitleEn: "Service",
    subtitleAr: "الخدمة",
    bodyEn:
      "Our reception staff speak fluent English and Arabic. They can exchange money at daily rates, provide local guide maps, summon taxis, arrange laundry and dry cleaning, and lend you a book from the small library by the souvenir shop.",
    bodyAr:
      "يتحدث موظفو الاستقبال لدينا الإنجليزية والعربية بطلاقة. يمكنهم صرف العملات بالأسعار اليومية وتوفير خرائط إرشادية محلية واستدعاء سيارات الأجرة وترتيب خدمة الغسيل والتنظيف الجاف وإعارتك كتاباً من المكتبة الصغيرة بجوار متجر الهدايا.",
    imageUrl: "/images/hotel/majlis-seating.webp",
    sortOrder: 3,
  },
  {
    key: "experiences.pool",
    page: "experiences",
    section: "pool",
    titleEn: "Rooftop pool and terrace",
    titleAr: "المسبح والتراس العلوي",
    subtitleEn: "Open daily until 20:00",
    subtitleAr: "مفتوح يومياً حتى 20:00",
    bodyEn:
      "The pool is outdoor and unheated, nine metres by four with a depth of 1.5 metres, framed by wooden decking for sunbathing and reading. You should be able to swim without feeling crowded, then take in the mountain air from the covered terrace. Use of the pool is free for guests.",
    bodyAr:
      "المسبح خارجي وغير مدفأ، بطول تسعة أمتار وعرض أربعة وعمق متر ونصف، تحيط به أرضية خشبية للاستلقاء والقراءة. ستتمكن من السباحة دون ازدحام، ثم استنشاق هواء الجبل من التراس المغطى. استخدام المسبح مجاني للضيوف.",
    imageUrl: "/images/hotel/rooftop-pool-day.webp",
    sortOrder: 1,
  },
  {
    key: "experiences.baths",
    page: "experiences",
    section: "baths",
    titleEn: "Afra Turkish Baths, sauna and Jacuzzi",
    titleAr: "حمّامات عفرا التركية والساونا والجاكوزي",
    subtitleEn: "Wellness in the basement",
    subtitleAr: "الاسترخاء في الطابق السفلي",
    bodyEn:
      "Relax by the water feature with tea or coffee, work off a few calories in the fitness room, then move between the steam room, the authentic sauna and the Jacuzzi. A barber and a qualified masseur offer sports and therapeutic massage. The baths welcome men and women together, so swimwear is worn at all times.",
    bodyAr:
      "استرخِ بجانب النافورة مع الشاي أو القهوة، واحرق بعض السعرات في غرفة اللياقة، ثم تنقّل بين غرفة البخار والساونا الأصيلة والجاكوزي. يقدّم حلاق ومدلّك مؤهل تدليكاً رياضياً وعلاجياً. تستقبل الحمّامات الرجال والنساء معاً، لذا يُرتدى زي السباحة طوال الوقت.",
    imageUrl: "/images/hotel/turkish-bath-hall.webp",
    sortOrder: 2,
  },
  {
    key: "experiences.dining",
    page: "experiences",
    section: "dining",
    titleEn: "Al Babour Restaurant",
    titleAr: "مطعم البابور",
    subtitleEn: "Breakfast 06:30–10:30 · Lunch 12:00–16:00 · Buffet until 22:00",
    subtitleAr: "الإفطار 06:30–10:30 · الغداء 12:00–16:00 · البوفيه حتى 22:00",
    bodyEn:
      "Wherever you decide to eat, you will receive freshly prepared local food of excellent quality at fair prices. Breakfast is a hot and cold buffet with unlimited juices, tea and coffee. Lunch brings a two or three course buffet of Arabic and international dishes, and the evening à la carte menu is presented daily by our chef. An 18-hour room service menu is delivered in 25 minutes.",
    bodyAr:
      "أينما قررت تناول الطعام، ستحصل على طعام محلي طازج بجودة ممتازة وأسعار عادلة. الإفطار بوفيه ساخن وبارد مع عصائر وشاي وقهوة بلا حدود. ويقدّم الغداء بوفيهاً من طبقين أو ثلاثة من الأطباق العربية والعالمية، ويعرض الشيف يومياً قائمة المساء حسب الطلب. وتُوصَل قائمة خدمة الغرف المتاحة 18 ساعة خلال 25 دقيقة.",
    imageUrl: "/images/hotel/mezze-buffet.webp",
    sortOrder: 3,
  },
  {
    key: "experiences.roof",
    page: "experiences",
    section: "roof",
    titleEn: "The Roof of Wonders",
    titleAr: "سطح العجائب",
    subtitleEn: "Daily 16:00–22:30",
    subtitleAr: "يومياً 16:00–22:30",
    bodyEn:
      "Healthy snacks to order, fruit juices, soft drinks and mineral water, with the chance to enjoy the hubble-bubble as the lights of Wadi Musa come on across the valley.",
    bodyAr:
      "وجبات خفيفة صحية حسب الطلب وعصائر فواكه ومشروبات غازية ومياه معدنية، مع فرصة الاستمتاع بالأرجيلة بينما تضيء أنوار وادي موسى عبر الوادي.",
    imageUrl: "/images/hotel/roof-of-wonders-terrace-guests.webp",
    sortOrder: 4,
  },
  {
    key: "experiences.facilities",
    page: "experiences",
    section: "facilities",
    titleEn: "Hotel facilities",
    titleAr: "مرافق الفندق",
    subtitleEn: "Everything you need, in-house",
    subtitleAr: "كل ما تحتاجه داخل الفندق",
    bodyEn:
      "A souvenir and gift shop with authentic Bedouin crafts and English guides to the area, a small book-swap library, a full laundry service with dry cleaning and ironing, baby cots on request, money exchange at reception and a lift to every floor.",
    bodyAr:
      "متجر هدايا وتذكارات يضم حرفاً بدوية أصيلة وأدلة سياحية بالإنجليزية عن المنطقة، ومكتبة صغيرة لتبادل الكتب، وخدمة غسيل كاملة مع تنظيف جاف وكي، وأسرّة أطفال عند الطلب، وصرف عملات في الاستقبال، ومصعد إلى كل طابق.",
    imageUrl: "/images/hotel/lobby-lounge.webp",
    sortOrder: 5,
  },
  {
    key: "experiences.petra",
    page: "experiences",
    section: "petra",
    titleEn: "Petra and beyond",
    titleAr: "البتراء وما بعدها",
    subtitleEn: "Programs arranged by the hotel",
    subtitleAr: "برامج ينظمها الفندق",
    bodyEn:
      "Our team organises programs selected carefully to suit all visitors: the historical and archaeological sites of Petra and Beidha (Little Petra), the beautiful mountain villages, and trips further afield towards the Red Sea. Programs vary with the season and events, so ask reception for what is running during your stay.",
    bodyAr:
      "ينظم فريقنا برامج مختارة بعناية لتناسب جميع الزوار: المواقع التاريخية والأثرية في البتراء والبيضا (البتراء الصغيرة) والقرى الجبلية الجميلة ورحلات أبعد نحو البحر الأحمر. تختلف البرامج مع الموسم والفعاليات، فاسأل الاستقبال عما هو متاح خلال إقامتك.",
    imageUrl: "/images/petra/petra-treasury-day.webp",
    sortOrder: 6,
  },
  {
    key: "contact.intro",
    page: "contact",
    section: "intro",
    titleEn: "We are always happy to welcome you",
    titleAr: "يسعدنا دائماً أن نرحّب بكم",
    subtitleEn: "Contact",
    subtitleAr: "اتصل بنا",
    bodyEn:
      "Our reservation team answers in English and Arabic. Call, email, or send a message below and we will reply within one working day.",
    bodyAr:
      "يجيب فريق الحجوزات لدينا بالعربية والإنجليزية. اتصل بنا أو راسلنا عبر البريد الإلكتروني أو أرسل رسالة أدناه وسنرد خلال يوم عمل واحد.",
    imageUrl: null,
    sortOrder: 1,
  },
] as const;

export const GALLERY = [
  { file: "hotel/hotel-exterior-street.webp", category: "HOTEL", captionEn: "The hotel from the main street of Wadi Musa", captionAr: "الفندق من الشارع الرئيسي في وادي موسى" },
  { file: "hotel/hotel-exterior-rooftop.webp", category: "HOTEL", captionEn: "Rooftop terrace and balconies", captionAr: "التراس العلوي والشرفات" },
  { file: "hotel/lobby-lounge.webp", category: "HOTEL", captionEn: "Lobby lounge", captionAr: "صالة البهو" },
  { file: "hotel/majlis-seating.webp", category: "HOTEL", captionEn: "Majlis seating in the lobby", captionAr: "جلسة مجلس في البهو" },
  { file: "hotel/double-room-warm.webp", category: "ROOMS", captionEn: "Deluxe Double", captionAr: "غرفة مزدوجة ديلوكس" },
  { file: "hotel/twin-room-balcony-curtains.webp", category: "ROOMS", captionEn: "Twin Room with Balcony", captionAr: "غرفة توأم مع شرفة" },
  { file: "hotel/triple-room.webp", category: "ROOMS", captionEn: "Family Triple", captionAr: "غرفة عائلية ثلاثية" },
  { file: "hotel/quad-room-beds.webp", category: "ROOMS", captionEn: "Group Quad", captionAr: "غرفة رباعية للمجموعات" },
  { file: "hotel/suite-lounge.webp", category: "ROOMS", captionEn: "Petra Suite lounge", captionAr: "صالة جناح البتراء" },
  { file: "hotel/room-double-window.webp", category: "ROOMS", captionEn: "Room with seating corner", captionAr: "غرفة مع ركن جلوس" },
  { file: "hotel/twin-beds-detail.webp", category: "ROOMS", captionEn: "Twin beds", captionAr: "سريران مفردان" },
  { file: "hotel/room-tv-desk.webp", category: "ROOMS", captionEn: "Television and desk", captionAr: "تلفاز ومكتب" },
  { file: "hotel/al-babour-restaurant.webp", category: "DINING", captionEn: "Al Babour Restaurant", captionAr: "مطعم البابور" },
  { file: "hotel/mezze-buffet.webp", category: "DINING", captionEn: "Mezze buffet", captionAr: "بوفيه المقبلات" },
  { file: "hotel/salad-buffet-wide.webp", category: "DINING", captionEn: "Fresh salads", captionAr: "سلطات طازجة" },
  { file: "hotel/dessert-buffet.webp", category: "DINING", captionEn: "Oriental desserts", captionAr: "حلويات شرقية" },
  { file: "hotel/buffet-counter.webp", category: "DINING", captionEn: "Buffet counter", captionAr: "طاولة البوفيه" },
  { file: "hotel/buffet-salads.webp", category: "DINING", captionEn: "Buffet detail", captionAr: "تفاصيل البوفيه" },
  { file: "hotel/rooftop-pool-night.webp", category: "POOL", captionEn: "Rooftop pool at night", captionAr: "المسبح العلوي ليلاً" },
  { file: "hotel/rooftop-pool-day.webp", category: "POOL", captionEn: "Rooftop pool and sun loungers", captionAr: "المسبح العلوي وكراسي الاستلقاء" },
  { file: "hotel/terrace-pergola.webp", category: "POOL", captionEn: "Terrace pergola", captionAr: "بيرغولا التراس" },
  { file: "hotel/terrace-evening.webp", category: "POOL", captionEn: "Terrace in the evening", captionAr: "التراس في المساء" },
  { file: "hotel/roof-of-wonders-terrace-guests.webp", category: "POOL", captionEn: "The Roof of Wonders", captionAr: "سطح العجائب" },
  { file: "hotel/turkish-bath-hall.webp", category: "WELLNESS", captionEn: "Afra Turkish Baths steam hall", captionAr: "قاعة البخار في حمّامات عفرا التركية" },
  { file: "hotel/sauna-cabin.webp", category: "WELLNESS", captionEn: "Sauna", captionAr: "الساونا" },
  { file: "hotel/sauna-bucket.webp", category: "WELLNESS", captionEn: "Sauna detail", captionAr: "تفاصيل الساونا" },
  { file: "petra/petra-treasury-night.webp", category: "PETRA", captionEn: "Petra by Night at the Treasury", captionAr: "البتراء ليلاً أمام الخزنة" },
  { file: "petra/petra-treasury-day.webp", category: "PETRA", captionEn: "Al-Khazneh, the Treasury", captionAr: "الخزنة" },
  { file: "petra/petra-siq.webp", category: "PETRA", captionEn: "Walking the Siq", captionAr: "السير في السيق" },
  { file: "petra/petra-outer-siq.webp", category: "PETRA", captionEn: "The outer Siq", captionAr: "السيق الخارجي" },
] as const;

export const USERS = [
  { email: "admin@demo.baynari.local", name: "Demo Administrator", role: "ADMIN" },
  { email: "manager@demo.baynari.local", name: "Reservation Manager", role: "MANAGER" },
  { email: "frontdesk@demo.baynari.local", name: "Front Desk", role: "FRONT_DESK" },
  { email: "viewer@demo.baynari.local", name: "Owner (read only)", role: "VIEWER" },
] as const;

export const DEMO_GUESTS = [
  ["Layla", "Haddad", "JO"], ["Omar", "Al-Rawashdeh", "JO"], ["Emma", "Whitfield", "GB"], ["Lukas", "Brandt", "DE"],
  ["Chloé", "Marchand", "FR"], ["Daniel", "Reyes", "US"], ["Giulia", "Conti", "IT"], ["Sofía", "Navarro", "ES"],
  ["Faisal", "Al-Qahtani", "SA"], ["Noura", "Al-Mansoori", "AE"], ["Minjun", "Park", "KR"], ["Yuki", "Tanaka", "JP"],
  ["Olivia", "Bennett", "AU"], ["Daan", "de Vries", "NL"], ["Ahmed", "Mostafa", "EG"], ["Zeynep", "Kaya", "TR"],
  ["Priya", "Raman", "IN"], ["Mateus", "Oliveira", "BR"], ["Hanna", "Lindqvist", "SE"], ["Tomasz", "Nowak", "PL"],
  ["Rania", "Khoury", "LB"], ["Jonas", "Meyer", "CH"], ["Aisha", "Bello", "NG"], ["Liam", "O'Connor", "IE"],
] as const;
