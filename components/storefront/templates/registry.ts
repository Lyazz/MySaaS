import type { Component } from 'vue'

// Classic Imports
import ClassicCategory from './classic/Category.vue'
import ClassicContact from './classic/ContactPage.vue'
import ClassicAbout from './classic/AboutPage.vue'
import ClassicCheckout from './classic/Checkout.vue'
import ClassicHome from './classic/Home.vue'
import ClassicProduct from './classic/Product.vue'
import ClassicShop from './classic/Shop.vue'
import ClassicStoreShell from './classic/StoreShell.vue'
import ClassicThemeProvider from './classic/ThemeProvider.vue'
import ClassicCart from './classic/Cart.vue'

// Modern Imports
import ModernCategory from './modern/Category.vue'
import ModernContact from './modern/ContactPage.vue'
import ModernAbout from './modern/AboutPage.vue'
import ModernCheckout from './modern/Checkout.vue'
import ModernHome from './modern/Home.vue'
import ModernProduct from './modern/Product.vue'
import ModernShop from './modern/Shop.vue'
import ModernStoreShell from './modern/StoreShell.vue'
import ModernThemeProvider from './modern/ThemeProvider.vue'
import ModernCart from './modern/Cart.vue'

// Food Imports
import FoodCategory from './food/Category.vue'
import FoodContact from './food/ContactPage.vue'
import FoodAbout from './food/AboutPage.vue'
import FoodCheckout from './food/Checkout.vue'
import FoodHome from './food/Home.vue'
import FoodProduct from './food/Product.vue'
import FoodShop from './food/Shop.vue'
import FoodStoreShell from './food/StoreShell.vue'
import FoodThemeProvider from './food/ThemeProvider.vue'
import FoodCart from './food/Cart.vue'

// Street Imports
import StreetHome from './street/Home.vue'
import StreetStoreShell from './street/StoreShell.vue'
import StreetThemeProvider from './street/ThemeProvider.vue'
import StreetCategory from './street/Category.vue'
import StreetContact from './street/ContactPage.vue'
import StreetAbout from './street/AboutPage.vue'
import StreetCheckout from './street/Checkout.vue'
import StreetProduct from './street/Product.vue'
import StreetShop from './street/Shop.vue'
import StreetCart from './street/Cart.vue'

// Cozy Imports
import CozyHome from './cozy/Home.vue'
import CozyStoreShell from './cozy/StoreShell.vue'
import CozyThemeProvider from './cozy/ThemeProvider.vue'
import CozyCategory from './cozy/Category.vue'
import CozyContact from './cozy/ContactPage.vue'
import CozyAbout from './cozy/AboutPage.vue'
import CozyCheckout from './cozy/Checkout.vue'
import CozyProduct from './cozy/Product.vue'
import CozyShop from './cozy/Shop.vue'
import CozyCart from './cozy/Cart.vue'

// Cyber Imports
import CyberHome from './cyber/Home.vue'
import CyberStoreShell from './cyber/StoreShell.vue'
import CyberThemeProvider from './cyber/ThemeProvider.vue'
import CyberCategory from './cyber/Category.vue'
import CyberContact from './cyber/ContactPage.vue'
import CyberAbout from './cyber/AboutPage.vue'
import CyberCheckout from './cyber/Checkout.vue'
import CyberProduct from './cyber/Product.vue'
import CyberShop from './cyber/Shop.vue'
import CyberCart from './cyber/Cart.vue'

// Stationnery Imports
import StationneryHome from './stationnery/Home.vue'
import StationneryStoreShell from './stationnery/StoreShell.vue'
import StationneryThemeProvider from './stationnery/ThemeProvider.vue'
import StationneryCategory from './stationnery/Category.vue'
import StationneryContact from './stationnery/ContactPage.vue'
import StationneryAbout from './stationnery/AboutPage.vue'
import StationneryCheckout from './stationnery/Checkout.vue'
import StationneryProduct from './stationnery/Product.vue'
import StationneryShop from './stationnery/Shop.vue'
import StationneryCart from './stationnery/Cart.vue'

// Wellness Imports
import WellnessHome from './wellness/Home.vue'
import WellnessStoreShell from './wellness/StoreShell.vue'
import WellnessThemeProvider from './wellness/ThemeProvider.vue'
import WellnessCategory from './wellness/Category.vue'
import WellnessContact from './wellness/ContactPage.vue'
import WellnessAbout from './wellness/AboutPage.vue'
import WellnessCheckout from './wellness/Checkout.vue'
import WellnessProduct from './wellness/Product.vue'
import WellnessShop from './wellness/Shop.vue'
import WellnessCart from './wellness/Cart.vue'

export type TemplateKey = 'classic' | 'modern' | 'street' | 'cozy' | 'cyber' | 'stationnery' | 'food' | 'wellness'
export const DEFAULT_TEMPLATE: TemplateKey = 'modern'

export const resolveTemplateKey = (value?: string | null): TemplateKey =>
  ['classic', 'modern', 'street', 'cozy', 'cyber', 'stationnery', 'food', 'wellness'].includes(value as any) ? (value as TemplateKey) : DEFAULT_TEMPLATE

export const homeTemplates = {
  classic: ClassicHome,
  modern: ModernHome,
  street: StreetHome,
  cozy: CozyHome,
  cyber: CyberHome,
  stationnery: StationneryHome,
  food: FoodHome,
  wellness: WellnessHome
} satisfies Record<TemplateKey, Component>

export const productTemplates = {
  classic: ClassicProduct,
  modern: ModernProduct,
  street: StreetProduct,
  cozy: CozyProduct,
  cyber: CyberProduct,
  stationnery: StationneryProduct,
  food: FoodProduct,
  wellness: WellnessProduct
} satisfies Record<TemplateKey, Component>

export const categoryTemplates = {
  classic: ClassicCategory,
  modern: ModernCategory,
  street: StreetCategory,
  cozy: CozyCategory,
  cyber: CyberCategory,
  stationnery: StationneryCategory,
  food: FoodCategory,
  wellness: WellnessCategory
} satisfies Record<TemplateKey, Component>

export const storeShellTemplates = {
  classic: ClassicStoreShell,
  modern: ModernStoreShell,
  street: StreetStoreShell,
  cozy: CozyStoreShell,
  cyber: CyberStoreShell,
  stationnery: StationneryStoreShell,
  food: FoodStoreShell,
  wellness: WellnessStoreShell
} satisfies Record<TemplateKey, Component>

export const shopTemplates = {
  classic: ClassicShop,
  modern: ModernShop,
  street: StreetShop,
  cozy: CozyShop,
  cyber: CyberShop,
  stationnery: StationneryShop,
  food: FoodShop,
  wellness: WellnessShop
} satisfies Record<TemplateKey, Component>

export const checkoutTemplates = {
  classic: ClassicCheckout,
  modern: ModernCheckout,
  street: StreetCheckout,
  cozy: CozyCheckout,
  cyber: CyberCheckout,
  stationnery: StationneryCheckout,
  food: FoodCheckout,
  wellness: WellnessCheckout
} satisfies Record<TemplateKey, Component>

export const cartTemplates = {
  classic: ClassicCart,
  modern: ModernCart,
  street: StreetCart,
  cozy: CozyCart,
  cyber: CyberCart,
  stationnery: StationneryCart,
  food: FoodCart,
  wellness: WellnessCart
} satisfies Record<TemplateKey, Component>

export const aboutPageTemplates = {
  classic: ClassicAbout,
  modern: ModernAbout,
  street: StreetAbout,
  cozy: CozyAbout,
  cyber: CyberAbout,
  stationnery: StationneryAbout,
  food: FoodAbout,
  wellness: WellnessAbout
} satisfies Record<TemplateKey, Component>

export const contactPageTemplates = {
  classic: ClassicContact,
  modern: ModernContact,
  street: StreetContact,
  cozy: CozyContact,
  cyber: CyberContact,
  stationnery: StationneryContact,
  food: FoodContact,
  wellness: WellnessContact
} satisfies Record<TemplateKey, Component>

export const themeProviderTemplates = {
  classic: ClassicThemeProvider,
  modern: ModernThemeProvider,
  street: StreetThemeProvider,
  cozy: CozyThemeProvider,
  cyber: CyberThemeProvider,
  stationnery: StationneryThemeProvider,
  food: FoodThemeProvider,
  wellness: WellnessThemeProvider
} satisfies Record<TemplateKey, Component>

export const selectTemplate = (
  templates: Record<TemplateKey, Component>,
  key?: string | null
): Component => {
  const resolved = resolveTemplateKey(key)
  return templates[resolved]
}
