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

export type TemplateKey = 'classic' | 'modern' | 'street' | 'cozy' | 'cyber'
export const DEFAULT_TEMPLATE: TemplateKey = 'modern'

export const resolveTemplateKey = (value?: string | null): TemplateKey =>
  ['classic', 'modern', 'street', 'cozy', 'cyber'].includes(value as any) ? (value as TemplateKey) : DEFAULT_TEMPLATE

export const homeTemplates = {
  classic: ClassicHome,
  modern: ModernHome,
  street: StreetHome,
  cozy: CozyHome,
  cyber: CyberHome
} satisfies Record<TemplateKey, Component>

export const productTemplates = {
  classic: ClassicProduct,
  modern: ModernProduct,
  street: StreetProduct,
  cozy: CozyProduct,
  cyber: CyberProduct
} satisfies Record<TemplateKey, Component>

export const categoryTemplates = {
  classic: ClassicCategory,
  modern: ModernCategory,
  street: StreetCategory,
  cozy: CozyCategory,
  cyber: CyberCategory
} satisfies Record<TemplateKey, Component>

export const storeShellTemplates = {
  classic: ClassicStoreShell,
  modern: ModernStoreShell,
  street: StreetStoreShell,
  cozy: CozyStoreShell,
  cyber: CyberStoreShell
} satisfies Record<TemplateKey, Component>

export const shopTemplates = {
  classic: ClassicShop,
  modern: ModernShop,
  street: StreetShop,
  cozy: CozyShop,
  cyber: CyberShop
} satisfies Record<TemplateKey, Component>

export const checkoutTemplates = {
  classic: ClassicCheckout,
  modern: ModernCheckout,
  street: StreetCheckout,
  cozy: CozyCheckout,
  cyber: CyberCheckout
} satisfies Record<TemplateKey, Component>

export const cartTemplates = {
  classic: ClassicCart,
  modern: ModernCart,
  street: StreetCart,
  cozy: CozyCart,
  cyber: CyberCart
} satisfies Record<TemplateKey, Component>

export const aboutPageTemplates = {
  classic: ClassicAbout,
  modern: ModernAbout,
  street: StreetAbout,
  cozy: CozyAbout,
  cyber: CyberAbout
} satisfies Record<TemplateKey, Component>

export const contactPageTemplates = {
  classic: ClassicContact,
  modern: ModernContact,
  street: StreetContact,
  cozy: CozyContact,
  cyber: CyberContact
} satisfies Record<TemplateKey, Component>

export const themeProviderTemplates = {
  classic: ClassicThemeProvider,
  modern: ModernThemeProvider,
  street: StreetThemeProvider,
  cozy: CozyThemeProvider,
  cyber: CyberThemeProvider
} satisfies Record<TemplateKey, Component>

export const selectTemplate = (
  templates: Record<TemplateKey, Component>,
  key?: string | null
): Component => {
  const resolved = resolveTemplateKey(key)
  return templates[resolved]
}
