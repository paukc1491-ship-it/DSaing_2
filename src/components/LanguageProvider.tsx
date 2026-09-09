// components/LanguageProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { translations as sharedTranslations } from '@/lib/translations';

export type Language = 'my' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  my: {
    ...sharedTranslations.my,
    // Common
    'common.back': 'နောက်သို့',
    'common.save': 'သိမ်းမည်',
    'common.saving': 'သိမ်းနေသည်...',
    'common.cancel': 'မလုပ်တော့ပါ',
    'common.delete': 'ဖျက်မည်',
    'common.edit': 'ပြင်ဆင်မည်',
    'common.loading': 'ဖွင့်နေသည်...',
    'common.error': 'အမှားရှိသည်',
    'common.success': 'အောင်မြင်ပါသည်',
    'common.retry': 'ပြန်စမ်းမည်',
    'common.pleaseWait': 'ကျေးဇူးပြု၍ စောင့်ပါ...',
    'common.backToHome': 'မူလစာမျက်နှာသို့',
    'common.noResults': 'ရလဒ်မရှိပါ',
    'common.noResultsDesc': 'သင်ရှာဖွေသော ပစ္စည်းမရှိပါ',
    'common.clearSearch': 'ရှာဖွေမှုရှင်းမည်',
    'common.found': 'တွေ့ရှိသည်',
    'common.result': 'ရလဒ်',
    
    // Header
    'header.allLocations': 'အားလုံး',
    'header.searchPlaceholder': '{location} တွင် ရှာဖွေရန်...',
    
    // Sidebar
    'sidebar.profile': 'ပရိုဖိုင်',
    'sidebar.dashboard': 'ဒက်ရှ်ဘုတ်',
    'sidebar.settings': 'ဆက်တင်များ',
    'sidebar.help': 'အကူအညီ',
    'sidebar.logout': 'ထွက်မည်',
    'sidebar.welcome': 'D Saing မှ ကြိုဆိုပါသည်',
    'sidebar.login': 'ဝင်မည်',
    'sidebar.signup': 'အကောင့်ဖွင့်မည်',
    'sidebar.seller': 'ရောင်းချသူ',
    'sidebar.buyer': 'ဝယ်ယူသူ',
    'sidebar.guest': 'ဧည့်သည်',
    
    // Dashboard
    'dashboard.title': 'ဒက်ရှ်ဘုတ်',
    'dashboard.welcomeBack': 'ပြန်လည်ကြိုဆိုပါသည်',
    'dashboard.youHave': 'သင့်တွင်',
    'dashboard.productsInShop': 'ပစ္စည်းများရှိသည်',
    'dashboard.totalProducts': 'စုစုပေါင်းပစ္စည်း',
    'dashboard.totalCustomers': 'စုစုပေါင်းဝယ်သူ',
    'dashboard.addNewProduct': 'ပစ္စည်းအသစ်ထည့်မည်',
    'dashboard.manageProducts': 'ပစ္စည်းများစီမံမည်',
    'dashboard.recentProducts': 'မကြာသေးမီက ပစ္စည်းများ',
    'dashboard.viewAll': 'အားလုံးကြည့်မည်',
    'dashboard.searchPlaceholder': '🔍 ပစ္စည်းအမည်၊ အမှတ်တံဆိပ် သို့မဟုတ် အမျိုးအစားဖြင့် ရှာဖွေရန်...',
    'dashboard.found': 'တွေ့ရှိသည်',
    'dashboard.product': 'ပစ္စည်း',
    'dashboard.products': 'ပစ္စည်းများ',
    'dashboard.noMatch': 'သင်ရှာဖွေသော ပစ္စည်းမရှိပါ',
    'dashboard.noProducts': 'ပစ္စည်းမရှိသေးပါ။ "ပစ္စည်းအသစ်ထည့်မည်" ကိုနှိပ်ပါ။',
    'dashboard.outOfStock': 'ပစ္စည်းကုန်သွားပါပြီ',
    'dashboard.lowStock': 'စတော့နည်းနေသည်',
    'dashboard.inStock': 'စတော့ရှိသည်',
    'dashboard.left': 'ကျန်သည်',
    'dashboard.monthlySalesSummary': 'လစဉ် ရောင်းအား အနှစ်ချုပ်',
    'dashboard.selectYear': 'ခုနှစ် ရွေးပါ',
    'dashboard.selectMonth': 'လ ရွေးပါ',
    
    // Product
    'product.name': 'ပစ္စည်းအမည်',
    'product.brand': 'အမှတ်တံဆိပ်',
    'product.price': 'ဈေးနှုန်း',
    'product.category': 'အမျိုးအစား',
    'product.stock': 'စတော့အရေအတွက်',
    'product.location': 'တည်နေရာ',
    'product.discount': 'လျှော့စျေး',
    'product.image': 'ပုံ',
    'product.description': 'ဖော်ပြချက်',
    'product.selectCategory': 'အမျိုးအစားရွေးပါ',
    'product.stockPlaceholder': 'ဥပမာ ၁၀၀',
    'product.discountPlaceholder': 'ဥပမာ ၂၀% OFF',
    'product.descPlaceholder': 'ပစ္စည်းအကြောင်းဖော်ပြပါ...',
    'product.addButton': 'ပစ္စည်းထည့်မည်',
    'product.addTitle': 'ပစ္စည်းအသစ်ထည့်ရန်',
    'product.addDesc': 'သင့်ပစ္စည်းကို စာရင်းသွင်းရန် အချက်အလက်များဖြည့်ပါ',
    'product.loginFirst': 'ကျေးဇူးပြု၍ အရင် Login ဝင်ပါ',
    'product.addSuccess': 'ပစ္စည်းထည့်သွင်းခြင်း အောင်မြင်ပါသည်',
    'product.addFailed': 'ပစ္စည်းထည့်သွင်းခြင်း မအောင်မြင်ပါ',
    
    // Manage Products
    'manage.title': 'ပစ္စည်းများစီမံရန်',
    'manage.addNew': 'အသစ်ထည့်မည်',
    'manage.addNewProduct': 'ပစ္စည်းအသစ်ထည့်မည်',
    'manage.searchPlaceholder': '🔍 ပစ္စည်းအမည်၊ အမှတ်တံဆိပ်၊ အမျိုးအစား သို့မဟုတ် ဈေးနှုန်းဖြင့် ရှာဖွေရန်...',
    'manage.product': 'ပစ္စည်း',
    'manage.products': 'ပစ္စည်းများ',
    'manage.found': 'တွေ့ရှိသည်',
    'manage.noMatch': 'သင်ရှာဖွေသော ပစ္စည်းမရှိပါ',
    'manage.noProducts': 'ပစ္စည်းမရှိသေးပါ',
    'manage.adjustSearch': 'သင့်ရှာဖွေမှုကို ပြန်လည်စစ်ဆေးပါ',
    'manage.startAdding': 'သင့်ပထမဆုံးပစ္စည်းကို စတင်ထည့်သွင်းပါ',
    'manage.productName': 'ပစ္စည်းအမည်',
    'manage.price': 'ဈေးနှုန်း',
    'manage.brand': 'အမှတ်တံဆိပ်',
    'manage.category': 'အမျိုးအစား',
    'manage.stock': 'စတော့',
    'manage.discount': 'လျှော့စျေး',
    'manage.imageUrl': 'ပုံလိပ်စာ',
    'manage.untitled': 'အမည်မသိ',
    'manage.uncategorized': 'အမျိုးအစားမသတ်မှတ်ရသေး',
    'manage.noBrand': 'အမှတ်တံဆိပ်မရှိ',
    'manage.inStock': 'စတော့ရှိသည်',
    'manage.outOfStock': 'ပစ္စည်းကုန်သွားပါပြီ',
    'manage.deleteConfirm': '"{title}" ကိုဖျက်ရန်သေချာပါသလား?',
    'manage.deleteSuccess': 'ပစ္စည်းဖျက်ခြင်း အောင်မြင်ပါသည်',
    'manage.deleteFailed': 'ပစ္စည်းဖျက်ခြင်း မအောင်မြင်ပါ',
    'manage.updateSuccess': 'ပစ္စည်းပြင်ဆင်ခြင်း အောင်မြင်ပါသည်',
    'manage.updateFailed': 'ပစ္စည်းပြင်ဆင်ခြင်း မအောင်မြင်ပါ',
    
    // Settings
    'settings': 'ဆက်တင်များ',
    'profile': 'ပရိုဖိုင်',
    'username': 'အသုံးပြုသူအမည်',
    'email': 'အီးမေးလ်',
    'phone': 'ဖုန်းနံပါတ်',
    'bio': 'ကိုယ်ရေးအကျဉ်း',
    'displayName': 'သင့်အမည်ပြရန်',
    'phonePlaceholder': '၀၉ ၁၂၃ ၄၅၆ ၇၈၉',
    'bioPlaceholder': 'ကိုယ်ရေးအကျဉ်းရေးပါ...',
    'shop': 'ဆိုင်',
    'shopName': 'ဆိုင်အမည်',
    'shopAddress': 'ဆိုင်လိပ်စာ',
    'shopNamePlaceholder': 'သင့်ဆိုင်အမည်',
    'shopAddressPlaceholder': 'အမှတ်၊ လမ်း၊ မြို့',
    'shownToCustomers': 'ဝယ်သူများကိုပြသမည်',
    'preferences': 'ကြိုက်နှစ်သက်မှုများ',
    'language': 'ဘာသာစကား',
    'languageDesc': 'သင်ကြိုက်နှစ်သက်ရာ ဘာသာစကားရွေးရန်',
    'accountType': 'အကောင့်အမျိုးအစား',
    'seller': 'ရောင်းချသူ',
    'buyer': 'ဝယ်ယူသူ',
    'pro': 'Pro',
    'basic': 'Basic',
    'saved': 'သိမ်းဆည်းပြီးပါပြီ',
    'noChanges': 'ပြောင်းလဲမှုမရှိပါ',
    'thirtyDayRule': 'ရက် ၃၀ အတွင်းတစ်ကြိမ်သာ ပြောင်းလို့ရသည်',
    'availableOn': 'ရက်စွဲတွင် ပြောင်းလို့ရမည်',
    'availableNow': 'ပြောင်းလို့ရပြီ',
    'alwaysAvailable': 'အမြဲတမ်းပြောင်းလို့ရသည်',
    
    // Add Product specific
    'Product Name': 'ပစ္စည်းအမည်',
    'Product Brand': 'အမှတ်တံဆိပ်',
    'Brand Placeholder': 'ဥပမာ Nike, Apple',
    'Price Placeholder': 'ဥပမာ ၄၅၀,၀၀၀ ကျပ်',
    'Add Title': 'ပစ္စည်းအသစ်ထည့်ရန်',
    'Add Description': 'သင့်ပစ္စည်းကို စာရင်းသွင်းရန် အချက်အလက်များဖြည့်ပါ',
    'Login First': 'ကျေးဇူးပြု၍ အရင် Login ဝင်ပါ',
    'Add Success': 'ပစ္စည်းထည့်သွင်းခြင်း အောင်မြင်ပါသည်',
    'Add Failed': 'ပစ္စည်းထည့်သွင်းခြင်း မအောင်မြင်ပါ',
  },
  en: {
    ...sharedTranslations.en,
    // Common
    'common.back': 'Back',
    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.retry': 'Retry',
    'common.pleaseWait': 'Please wait...',
    'common.backToHome': 'Back to Home',
    'common.noResults': 'No results found',
    'common.noResultsDesc': 'We couldn\'t find any products matching',
    'common.clearSearch': 'Clear Search',
    'common.found': 'Found',
    'common.result': 'result',
    
    // Header
    'header.allLocations': 'All Locations',
    'header.searchPlaceholder': 'Search products in {location}...',
    
    // Sidebar
    'sidebar.profile': 'Profile',
    'sidebar.dashboard': 'Dashboard',
    'sidebar.settings': 'Settings',
    'sidebar.help': 'Help & Support',
    'sidebar.logout': 'Logout',
    'sidebar.welcome': 'Welcome to D Saing',
    'sidebar.login': 'Login',
    'sidebar.signup': 'Sign Up',
    'sidebar.seller': 'Seller',
    'sidebar.buyer': 'Buyer',
    'sidebar.guest': 'Guest',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcomeBack': 'Welcome back',
    'dashboard.youHave': 'You have',
    'dashboard.productsInShop': 'products in your shop',
    'dashboard.totalProducts': 'Total Products',
    'dashboard.totalCustomers': 'Total Customers',
    'dashboard.addNewProduct': 'Add New Product',
    'dashboard.manageProducts': 'Manage Products',
    'dashboard.recentProducts': 'Recent Products',
    'dashboard.viewAll': 'View all',
    'dashboard.searchPlaceholder': '🔍 Search products by name, brand or category...',
    'dashboard.found': 'Found',
    'dashboard.product': 'product',
    'dashboard.products': 'products',
    'dashboard.noMatch': 'No products match your search.',
    'dashboard.noProducts': 'No products yet. Click "Add New Product" to get started!',
    'dashboard.outOfStock': 'Out of Stock',
    'dashboard.lowStock': 'low stock',
    'dashboard.inStock': 'in stock',
    'dashboard.left': 'left',
    'dashboard.monthlySalesSummary': 'Monthly Sales Summary',
    'dashboard.selectYear': 'Select Year',
    'dashboard.selectMonth': 'Select Month',
    
    // Product
    'product.name': 'Product Name',
    'product.brand': 'Brand',
    'product.price': 'Price',
    'product.category': 'Category',
    'product.stock': 'Stock',
    'product.location': 'Location',
    'product.discount': 'Discount',
    'product.image': 'Image',
    'product.description': 'Description',
    'product.selectCategory': 'Select Category',
    'product.stockPlaceholder': 'e.g., 100',
    'product.discountPlaceholder': 'e.g., 20% OFF',
    'product.descPlaceholder': 'Describe your product...',
    'product.addButton': 'Add Product',
    'product.addTitle': 'Add New Product',
    'product.addDesc': 'Fill in the details to list your product',
    'product.loginFirst': 'Please login first',
    'product.addSuccess': 'Product added successfully!',
    'product.addFailed': 'Failed to add product',
    
    // Manage Products
    'manage.title': 'Manage Products',
    'manage.addNew': 'Add New',
    'manage.addNewProduct': 'Add New Product',
    'manage.searchPlaceholder': '🔍 Search products by name, brand, category or price...',
    'manage.product': 'product',
    'manage.products': 'products',
    'manage.found': 'found',
    'manage.noMatch': 'No products match your search',
    'manage.noProducts': 'No products yet',
    'manage.adjustSearch': 'Try adjusting your search terms',
    'manage.startAdding': 'Start by adding your first product',
    'manage.productName': 'Product name',
    'manage.price': 'Price',
    'manage.brand': 'Brand',
    'manage.category': 'Category',
    'manage.stock': 'Stock',
    'manage.discount': 'Discount',
    'manage.imageUrl': 'Image URL',
    'manage.untitled': 'Untitled',
    'manage.uncategorized': 'Uncategorized',
    'manage.noBrand': 'No Brand',
    'manage.inStock': 'in stock',
    'manage.outOfStock': 'Out of Stock',
    'manage.deleteConfirm': 'Are you sure you want to delete "{title}"?',
    'manage.deleteSuccess': 'Product deleted successfully!',
    'manage.deleteFailed': 'Failed to delete product',
    'manage.updateSuccess': 'Product updated successfully!',
    'manage.updateFailed': 'Failed to update product',
    
    // Settings
    'settings': 'Settings',
    'profile': 'Profile',
    'username': 'Username',
    'email': 'Email',
    'phone': 'Phone',
    'bio': 'Bio',
    'displayName': 'Your display name',
    'phonePlaceholder': '09 123 456 789',
    'bioPlaceholder': 'Tell about yourself...',
    'shop': 'Shop',
    'shopName': 'Shop Name',
    'shopAddress': 'Shop Address',
    'shopNamePlaceholder': 'Your shop name',
    'shopAddressPlaceholder': 'No.123, Street, Yangon',
    'shownToCustomers': 'Shown to customers',
    'preferences': 'Preferences',
    'language': 'Language',
    'languageDesc': 'Select your preferred language',
    'accountType': 'Account Type',
    'seller': 'Seller',
    'buyer': 'Buyer',
    'pro': 'Pro',
    'basic': 'Basic',
    'saved': 'Settings saved successfully!',
    'noChanges': 'No changes to save',
    'thirtyDayRule': 'Can be changed once every 30 days',
    'availableOn': 'Available on',
    'availableNow': 'Available now',
    'alwaysAvailable': 'Always available',
    
    // Add Product specific
    'Product Name': 'Product Name',
    'Product Brand': 'Brand',
    'Brand Placeholder': 'e.g., Nike, Apple',
    'Price Placeholder': 'e.g., 450,000 MMK',
    'Add Title': 'Add New Product',
    'Add Description': 'Fill in the details to list your product',
    'Login First': 'Please login first',
    'Add Success': 'Product added successfully!',
    'Add Failed': 'Failed to add product',
    
    // Notification
    'notification.newMessage': 'New message received',
    'notification.from': 'from',
    'notification.tapToView': 'Tap to view',
  }
};

export function LanguageProvider({ 
  children, 
  initialLanguage 
}: { 
  children: ReactNode;
  initialLanguage: Language;
}) {
  // English-only mode for now. Keep the translation dictionaries for later re-enablement.
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user?.emailVerified) {
        setLanguageState('en');
      }
    });
    return () => unsubscribe();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState('en');
    
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { language: 'en' });
        console.log('English-only language mode is enabled.');
      } catch (error) {
        console.error('Error saving language:', error);
      }
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageProvider;