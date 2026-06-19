import { db } from '../src/lib/db';

async function seed() {
  // Create categories and subcategories
  const categories = [
    { name: 'Fruits & Vegetables', nameHi: 'फल और सब्जियां', nameBn: 'ফল ও সবজি', sortOrder: 1 },
    { name: 'Dairy & Breakfast', nameHi: 'डेयरी और नाश्ता', nameBn: 'ডেয়ারি ও প্রাতঃরাশ', sortOrder: 2 },
    { name: 'Staples', nameHi: 'मसाले और अनाज', nameBn: 'মশলা ও শস্য', sortOrder: 3 },
    { name: 'Snacks & Beverages', nameHi: 'स्नैक्स और पेय', nameBn: 'স্ন্যাকস ও পানীয়', sortOrder: 4 },
    { name: 'Personal Care', nameHi: 'व्यक्तिगत देखभाल', nameBn: 'ব্যক্তিগত যত্ন', sortOrder: 5 },
    { name: 'Household', nameHi: 'घरेलू सामग्री', nameBn: 'গৃহস্থালি', sortOrder: 6 },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categories) {
    const created = await db.category.create({ data: cat });
    createdCategories[cat.name] = created.id;
    console.log(`Created category: ${cat.name}`);
  }

  // Create subcategories
  const subcategories = [
    { name: 'Fresh Fruits', nameHi: 'ताज़े फल', nameBn: 'তাজা ফল', parentId: createdCategories['Fruits & Vegetables'] },
    { name: 'Fresh Vegetables', nameHi: 'ताज़ी सब्जियां', nameBn: 'তাজা সবজি', parentId: createdCategories['Fruits & Vegetables'] },
    { name: 'Exotic Fruits', nameHi: 'एक्जोटिक फल', nameBn: 'এক্সোটিক ফল', parentId: createdCategories['Fruits & Vegetables'] },
    { name: 'Milk & Cream', nameHi: 'दूध और क्रीम', nameBn: 'দুধ ও ক্রিম', parentId: createdCategories['Dairy & Breakfast'] },
    { name: 'Yogurt & Curd', nameHi: 'दही और छाछ', nameBn: 'দই ও ঘোল', parentId: createdCategories['Dairy & Breakfast'] },
    { name: 'Cereal & Oats', nameHi: 'सिरियल और ओट्स', nameBn: 'সিরিয়াল ও ওটস', parentId: createdCategories['Dairy & Breakfast'] },
    { name: 'Rice & Rice Products', nameHi: 'चावल और चावल उत्पाद', nameBn: 'চাল ও চালজাত পণ্য', parentId: createdCategories['Staples'] },
    { name: 'Flour & Atta', nameHi: 'आटा और मैदा', nameBn: 'আটা ও ময়দা', parentId: createdCategories['Staples'] },
    { name: 'Spices & Masala', nameHi: 'मसाले', nameBn: 'মশলা', parentId: createdCategories['Staples'] },
    { name: 'Dal & Pulses', nameHi: 'दालें', nameBn: 'ডাল', parentId: createdCategories['Staples'] },
    { name: 'Cooking Oil', nameHi: 'खाना पकाने का तेल', nameBn: 'রান্নার তেল', parentId: createdCategories['Staples'] },
    { name: 'Chips & Namkeen', nameHi: 'चिप्स और नमकीन', nameBn: 'চিপস ও নমকীন', parentId: createdCategories['Snacks & Beverages'] },
    { name: 'Tea & Coffee', nameHi: 'चाय और कॉफी', nameBn: 'চা ও কফি', parentId: createdCategories['Snacks & Beverages'] },
    { name: 'Cold Drinks & Juices', nameHi: 'ठंडे पेय और जूस', nameBn: 'ঠাণ্ডা পানীয় ও জুস', parentId: createdCategories['Snacks & Beverages'] },
    { name: 'Skin Care', nameHi: 'स्किन केयर', nameBn: 'স্কিন কেয়ার', parentId: createdCategories['Personal Care'] },
    { name: 'Hair Care', nameHi: 'हेयर केयर', nameBn: 'হেয়ার কেয়ার', parentId: createdCategories['Personal Care'] },
    { name: 'Cleaning', nameHi: 'सफाई', nameBn: 'পরিষ্কার', parentId: createdCategories['Household'] },
    { name: 'Laundry', nameHi: 'कपड़े धोना', nameBn: 'লন্ড্রি', parentId: createdCategories['Household'] },
  ];

  const createdSubcategories: Record<string, string> = {};

  for (const sub of subcategories) {
    const created = await db.category.create({ data: sub });
    createdSubcategories[sub.name] = created.id;
    console.log(`Created subcategory: ${sub.name}`);
  }

  // Create products
  const products = [
    { name: 'Basmati Rice Premium', nameHi: 'प्रीमियम बासमती चावल', nameBn: 'প্রিমিয়াম বাসমতি চাল', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Rice & Rice Products'], basePrice: 180, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg","5kg"]', stock: 500, unitType: 'weight' },
    { name: 'Sona Masoori Rice', nameHi: 'सोना मसूरी चावल', nameBn: 'সোনা মাসুরি চাল', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Rice & Rice Products'], basePrice: 80, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg","5kg","10kg"]', stock: 1000, unitType: 'weight' },
    { name: 'Toor Dal', nameHi: 'तूर दाल', nameBn: 'তুর ডাল', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Dal & Pulses'], basePrice: 160, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg"]', stock: 300, unitType: 'weight' },
    { name: 'Moong Dal', nameHi: 'मूंग दाल', nameBn: 'মুগ ডাল', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Dal & Pulses'], basePrice: 140, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg"]', stock: 400, unitType: 'weight' },
    { name: 'Chana Dal', nameHi: 'चना दाल', nameBn: 'ছোলা ডাল', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Dal & Pulses'], basePrice: 120, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg"]', stock: 350, unitType: 'weight' },
    { name: 'Whole Wheat Atta', nameHi: 'गेहूं का आटा', nameBn: 'গমের আটা', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Flour & Atta'], basePrice: 55, baseUnit: '1kg', availableUnits: '["500g","1kg","2kg","5kg","10kg"]', stock: 800, unitType: 'weight' },
    { name: 'Maida', nameHi: 'मैदा', nameBn: 'ময়দা', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Flour & Atta'], basePrice: 45, baseUnit: '1kg', availableUnits: '["500g","1kg","2kg","5kg"]', stock: 600, unitType: 'weight' },
    { name: 'Turmeric Powder', nameHi: 'हल्दी पाउडर', nameBn: 'হলুদ গুঁড়া', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Spices & Masala'], basePrice: 220, baseUnit: '1kg', availableUnits: '["50g","100g","250g","500g","1kg"]', stock: 200, unitType: 'weight' },
    { name: 'Red Chilli Powder', nameHi: 'लाल मिर्च पाउडर', nameBn: 'লাল মরিচ গুঁড়া', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Spices & Masala'], basePrice: 280, baseUnit: '1kg', availableUnits: '["50g","100g","250g","500g","1kg"]', stock: 200, unitType: 'weight' },
    { name: 'Garam Masala', nameHi: 'गरम मसाला', nameBn: 'গরম মশলা', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Spices & Masala'], basePrice: 350, baseUnit: '1kg', availableUnits: '["50g","100g","250g","500g"]', stock: 150, unitType: 'weight' },
    { name: 'Mustard Oil', nameHi: 'सरसों का तेल', nameBn: 'সরিষার তেল', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Cooking Oil'], basePrice: 200, baseUnit: '1L', availableUnits: '["500ml","1L","2L","5L"]', stock: 400, unitType: 'weight' },
    { name: 'Sunflower Oil', nameHi: 'सूरजमुखी का तेल', nameBn: 'সূর্যমুখী তেল', categoryId: createdCategories['Staples'], subcategoryId: createdSubcategories['Cooking Oil'], basePrice: 150, baseUnit: '1L', availableUnits: '["500ml","1L","2L","5L"]', stock: 500, unitType: 'weight' },
    { name: 'Fresh Bananas', nameHi: 'ताज़े केले', nameBn: 'তাজা কলা', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Fresh Fruits'], basePrice: 60, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg"]', stock: 100, unitType: 'weight' },
    { name: 'Apples', nameHi: 'सेब', nameBn: 'আপেল', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Fresh Fruits'], basePrice: 220, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg"]', stock: 80, unitType: 'weight' },
    { name: 'Mangoes', nameHi: 'आम', nameBn: 'আম', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Fresh Fruits'], basePrice: 300, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg"]', stock: 50, unitType: 'weight' },
    { name: 'Tomatoes', nameHi: 'टमाटर', nameBn: 'টমেটো', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Fresh Vegetables'], basePrice: 40, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg","5kg"]', stock: 200, unitType: 'weight' },
    { name: 'Onions', nameHi: 'प्याज', nameBn: 'পেঁয়াজ', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Fresh Vegetables'], basePrice: 35, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg","5kg"]', stock: 300, unitType: 'weight' },
    { name: 'Potatoes', nameHi: 'आलू', nameBn: 'আলু', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Fresh Vegetables'], basePrice: 30, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg","5kg"]', stock: 500, unitType: 'weight' },
    { name: 'Green Avocados', nameHi: 'एवोकाडो', nameBn: 'এভোকাডো', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Exotic Fruits'], basePrice: 400, baseUnit: '1kg', availableUnits: '["250g","500g","1kg"]', stock: 30, unitType: 'weight' },
    { name: 'Blueberries', nameHi: 'ब्लूबेरी', nameBn: 'ব্লুবেরি', categoryId: createdCategories['Fruits & Vegetables'], subcategoryId: createdSubcategories['Exotic Fruits'], basePrice: 800, baseUnit: '1kg', availableUnits: '["100g","250g","500g"]', stock: 20, unitType: 'weight' },
    { name: 'Full Cream Milk', nameHi: 'फुल क्रीम दूध', nameBn: 'ফুল ক্রিম দুধ', categoryId: createdCategories['Dairy & Breakfast'], subcategoryId: createdSubcategories['Milk & Cream'], basePrice: 65, baseUnit: '1L', availableUnits: '["500ml","1L","2L"]', stock: 200, unitType: 'weight' },
    { name: 'Fresh Curd', nameHi: 'ताज़ा दही', nameBn: 'তাজা দই', categoryId: createdCategories['Dairy & Breakfast'], subcategoryId: createdSubcategories['Yogurt & Curd'], basePrice: 60, baseUnit: '1kg', availableUnits: '["250g","500g","1kg"]', stock: 150, unitType: 'weight' },
    { name: 'Oats', nameHi: 'ओट्स', nameBn: 'ওটস', categoryId: createdCategories['Dairy & Breakfast'], subcategoryId: createdSubcategories['Cereal & Oats'], basePrice: 180, baseUnit: '1kg', availableUnits: '["250g","500g","1kg","2kg"]', stock: 100, unitType: 'weight' },
    { name: 'Lay\'s Classic Salted', nameHi: 'लेज़ क्लासिक सॉल्टेड', nameBn: 'লেজ ক্লাসিক সলটেড', categoryId: createdCategories['Snacks & Beverages'], subcategoryId: createdSubcategories['Chips & Namkeen'], basePrice: 20, baseUnit: '1pc', availableUnits: '["1pc","2pc","5pc"]', stock: 500, unitType: 'piece' },
    { name: 'Tata Tea Gold', nameHi: 'टाटा टी गोल्ड', nameBn: 'টাটা টি গোল্ড', categoryId: createdCategories['Snacks & Beverages'], subcategoryId: createdSubcategories['Tea & Coffee'], basePrice: 450, baseUnit: '1kg', availableUnits: '["100g","250g","500g","1kg"]', stock: 200, unitType: 'weight' },
    { name: 'Coca Cola 2L', nameHi: 'कोका कोला 2L', nameBn: 'কোকাকোলা 2L', categoryId: createdCategories['Snacks & Beverages'], subcategoryId: createdSubcategories['Cold Drinks & Juices'], basePrice: 90, baseUnit: '1pc', availableUnits: '["1pc","2pc","5pc"]', stock: 300, unitType: 'piece' },
    { name: 'Nivea Body Lotion', nameHi: 'निविया बॉडी लोशन', nameBn: 'নিভিয়া বডি লোশন', categoryId: createdCategories['Personal Care'], subcategoryId: createdSubcategories['Skin Care'], basePrice: 250, baseUnit: '1pc', availableUnits: '["1pc","2pc"]', stock: 100, unitType: 'piece' },
    { name: 'Head & Shoulders Shampoo', nameHi: 'हेड एंड शोल्डर्स शैम्पू', nameBn: 'হেড অ্যান্ড শোল্ডার্স শ্যাম্পু', categoryId: createdCategories['Personal Care'], subcategoryId: createdSubcategories['Hair Care'], basePrice: 340, baseUnit: '1pc', availableUnits: '["1pc","2pc"]', stock: 80, unitType: 'piece' },
    { name: 'Vim Dishwash Liquid', nameHi: 'विम डिशवॉश लिक्विड', nameBn: 'ভিম ডিশওয়াশ লিকুইড', categoryId: createdCategories['Household'], subcategoryId: createdSubcategories['Cleaning'], basePrice: 120, baseUnit: '1pc', availableUnits: '["1pc","2pc","5pc"]', stock: 200, unitType: 'piece' },
    { name: 'Surf Excel Matic', nameHi: 'सर्फ एक्सेल मैटिक', nameBn: 'সার্ফ এক্সেল ম্যাটিক', categoryId: createdCategories['Household'], subcategoryId: createdSubcategories['Laundry'], basePrice: 350, baseUnit: '1kg', availableUnits: '["500g","1kg","2kg"]', stock: 150, unitType: 'weight' },
  ];

  for (const product of products) {
    await db.product.create({ data: product });
    console.log(`Created product: ${product.name}`);
  }

  // Create an admin user
  await db.user.create({
    data: {
      name: 'UK MART Admin',
      email: 'admin@ukmart.com',
      role: 'ADMIN',
      phone: '8100264108',
      isActive: true,
    },
  });
  console.log('Created admin user');

  // Create a sample offer
  await db.offer.create({
    data: {
      name: 'Welcome Discount',
      description: 'Get 10% off on your first order above ₹3000',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderAmount: 3000,
      maxDiscount: 500,
      isActive: true,
    },
  });
  console.log('Created sample offer');

  console.log('Seed completed!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });