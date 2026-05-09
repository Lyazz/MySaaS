import type { Component } from 'vue'

// Classic Imports
import ClassicCategory from './classic/Category.vue'
import ClassicContact from './classic/ContactPage.vue'
import ClassicAbout from './classic/AboutPage.vue'
import ClassicCheckout from './classic/Checkout.vue'
import ClassicHome from './classic/Home.vue'
import ClassicProduct from './classic/Product.vue'
import ClassicProductCard from './classic/ProductCard.vue'
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
import ModernProductCard from './modern/ProductCard.vue'
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
import FoodProductCard from './food/ProductCard.vue'
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
import StreetProductCard from './street/ProductCard.vue'
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
import CozyProductCard from './cozy/ProductCard.vue'
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
import CyberProductCard from './cyber/ProductCard.vue'
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
import StationneryProductCard from './stationnery/ProductCard.vue'
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
import WellnessProductCard from './wellness/ProductCard.vue'
import WellnessShop from './wellness/Shop.vue'
import WellnessCart from './wellness/Cart.vue'

// Playful Imports
import PlayfulHome from './playful/Home.vue'
import PlayfulStoreShell from './playful/StoreShell.vue'
import PlayfulThemeProvider from './playful/ThemeProvider.vue'
import PlayfulCategory from './playful/Category.vue'
import PlayfulContact from './playful/ContactPage.vue'
import PlayfulAbout from './playful/AboutPage.vue'
import PlayfulCheckout from './playful/Checkout.vue'
import PlayfulProduct from './playful/Product.vue'
import PlayfulProductCard from './playful/ProductCard.vue'
import PlayfulShop from './playful/Shop.vue'
import PlayfulCart from './playful/Cart.vue'

// Activewear Imports
import ActivewearHome from './activewear/Home.vue'
import ActivewearStoreShell from './activewear/StoreShell.vue'
import ActivewearThemeProvider from './activewear/ThemeProvider.vue'
import ActivewearCategory from './activewear/Category.vue'
import ActivewearContact from './activewear/ContactPage.vue'
import ActivewearAbout from './activewear/AboutPage.vue'
import ActivewearCheckout from './activewear/Checkout.vue'
import ActivewearProduct from './activewear/Product.vue'
import ActivewearProductCard from './activewear/ProductCard.vue'
import ActivewearShop from './activewear/Shop.vue'
import ActivewearCart from './activewear/Cart.vue'

// Chrono Imports
import ChronoHome from './chrono/Home.vue'
import ChronoStoreShell from './chrono/StoreShell.vue'
import ChronoThemeProvider from './chrono/ThemeProvider.vue'
import ChronoCategory from './chrono/Category.vue'
import ChronoContact from './chrono/ContactPage.vue'
import ChronoAbout from './chrono/AboutPage.vue'
import ChronoCheckout from './chrono/Checkout.vue'
import ChronoProduct from './chrono/Product.vue'
import ChronoProductCard from './chrono/ProductCard.vue'
import ChronoShop from './chrono/Shop.vue'
import ChronoCart from './chrono/Cart.vue'

// Maison Imports
import MaisonHome from './maison/Home.vue'
import MaisonStoreShell from './maison/StoreShell.vue'
import MaisonThemeProvider from './maison/ThemeProvider.vue'
import MaisonCategory from './maison/Category.vue'
import MaisonContact from './maison/ContactPage.vue'
import MaisonAbout from './maison/AboutPage.vue'
import MaisonCheckout from './maison/Checkout.vue'
import MaisonProduct from './maison/Product.vue'
import MaisonProductCard from './maison/ProductCard.vue'
import MaisonShop from './maison/Shop.vue'
import MaisonCart from './maison/Cart.vue'

// Arena Imports
import ArenaHome from './arena/Home.vue'
import ArenaStoreShell from './arena/StoreShell.vue'
import ArenaThemeProvider from './arena/ThemeProvider.vue'
import ArenaCategory from './arena/Category.vue'
import ArenaContact from './arena/ContactPage.vue'
import ArenaAbout from './arena/AboutPage.vue'
import ArenaCheckout from './arena/Checkout.vue'
import ArenaProduct from './arena/Product.vue'
import ArenaProductCard from './arena/ProductCard.vue'
import ArenaShop from './arena/Shop.vue'
import ArenaCart from './arena/Cart.vue'
import ArenaProductLandingPage from './arena/ProductLandingPage.vue'

import ModernProductLandingPage from './modern/ProductLandingPage.vue'
import ClassicProductLandingPage from './classic/ProductLandingPage.vue'
import StreetProductLandingPage from './street/ProductLandingPage.vue'
import CozyProductLandingPage from './cozy/ProductLandingPage.vue'
import CyberProductLandingPage from './cyber/ProductLandingPage.vue'
import StationneryProductLandingPage from './stationnery/ProductLandingPage.vue'
import FoodProductLandingPage from './food/ProductLandingPage.vue'
import WellnessProductLandingPage from './wellness/ProductLandingPage.vue'
import PlayfulProductLandingPage from './playful/ProductLandingPage.vue'
import ActivewearProductLandingPage from './activewear/ProductLandingPage.vue'

export type TemplateKey = 'classic' | 'modern' | 'street' | 'cozy' | 'cyber' | 'stationnery' | 'food' | 'wellness' | 'playful' | 'activewear' | 'chrono' | 'maison' | 'arena'
export const DEFAULT_TEMPLATE: TemplateKey = 'modern'

export const resolveTemplateKey = (value?: string | null): TemplateKey =>
  ['classic', 'modern', 'street', 'cozy', 'cyber', 'stationnery', 'food', 'wellness', 'playful', 'activewear', 'chrono', 'maison', 'arena'].includes(value as any) ? (value as TemplateKey) : DEFAULT_TEMPLATE

export const homeTemplates = {
  classic: ClassicHome,
  modern: ModernHome,
  street: StreetHome,
  cozy: CozyHome,
  cyber: CyberHome,
  stationnery: StationneryHome,
  food: FoodHome,
  wellness: WellnessHome,
  playful: PlayfulHome,
  activewear: ActivewearHome,
  chrono: ChronoHome,
  maison: MaisonHome,
  arena: ArenaHome
} satisfies Record<TemplateKey, Component>

export const productTemplates = {
  classic: ClassicProduct,
  modern: ModernProduct,
  street: StreetProduct,
  cozy: CozyProduct,
  cyber: CyberProduct,
  stationnery: StationneryProduct,
  food: FoodProduct,
  wellness: WellnessProduct,
  playful: PlayfulProduct,
  activewear: ActivewearProduct,
  chrono: ChronoProduct,
  maison: MaisonProduct,
  arena: ArenaProduct
} satisfies Record<TemplateKey, Component>

export const productCardTemplates = {
  classic: ClassicProductCard,
  modern: ModernProductCard,
  street: StreetProductCard,
  cozy: CozyProductCard,
  cyber: CyberProductCard,
  stationnery: StationneryProductCard,
  food: FoodProductCard,
  wellness: WellnessProductCard,
  playful: PlayfulProductCard,
  activewear: ActivewearProductCard,
  chrono: ChronoProductCard,
  maison: MaisonProductCard,
  arena: ArenaProductCard
} satisfies Record<TemplateKey, Component>

export const categoryTemplates = {
  classic: ClassicCategory,
  modern: ModernCategory,
  street: StreetCategory,
  cozy: CozyCategory,
  cyber: CyberCategory,
  stationnery: StationneryCategory,
  food: FoodCategory,
  wellness: WellnessCategory,
  playful: PlayfulCategory,
  activewear: ActivewearCategory,
  chrono: ChronoCategory,
  maison: MaisonCategory,
  arena: ArenaCategory
} satisfies Record<TemplateKey, Component>

export const storeShellTemplates = {
  classic: ClassicStoreShell,
  modern: ModernStoreShell,
  street: StreetStoreShell,
  cozy: CozyStoreShell,
  cyber: CyberStoreShell,
  stationnery: StationneryStoreShell,
  food: FoodStoreShell,
  wellness: WellnessStoreShell,
  playful: PlayfulStoreShell,
  activewear: ActivewearStoreShell,
  chrono: ChronoStoreShell,
  maison: MaisonStoreShell,
  arena: ArenaStoreShell
} satisfies Record<TemplateKey, Component>

export const shopTemplates = {
  classic: ClassicShop,
  modern: ModernShop,
  street: StreetShop,
  cozy: CozyShop,
  cyber: CyberShop,
  stationnery: StationneryShop,
  food: FoodShop,
  wellness: WellnessShop,
  playful: PlayfulShop,
  activewear: ActivewearShop,
  chrono: ChronoShop,
  maison: MaisonShop,
  arena: ArenaShop
} satisfies Record<TemplateKey, Component>

export const checkoutTemplates = {
  classic: ClassicCheckout,
  modern: ModernCheckout,
  street: StreetCheckout,
  cozy: CozyCheckout,
  cyber: CyberCheckout,
  stationnery: StationneryCheckout,
  food: FoodCheckout,
  wellness: WellnessCheckout,
  playful: PlayfulCheckout,
  activewear: ActivewearCheckout,
  chrono: ChronoCheckout,
  maison: MaisonCheckout,
  arena: ArenaCheckout
} satisfies Record<TemplateKey, Component>

export const cartTemplates = {
  classic: ClassicCart,
  modern: ModernCart,
  street: StreetCart,
  cozy: CozyCart,
  cyber: CyberCart,
  stationnery: StationneryCart,
  food: FoodCart,
  wellness: WellnessCart,
  playful: PlayfulCart,
  activewear: ActivewearCart,
  chrono: ChronoCart,
  maison: MaisonCart,
  arena: ArenaCart
} satisfies Record<TemplateKey, Component>

export const aboutPageTemplates = {
  classic: ClassicAbout,
  modern: ModernAbout,
  street: StreetAbout,
  cozy: CozyAbout,
  cyber: CyberAbout,
  stationnery: StationneryAbout,
  food: FoodAbout,
  wellness: WellnessAbout,
  playful: PlayfulAbout,
  activewear: ActivewearAbout,
  chrono: ChronoAbout,
  maison: MaisonAbout,
  arena: ArenaAbout
} satisfies Record<TemplateKey, Component>

export const contactPageTemplates = {
  classic: ClassicContact,
  modern: ModernContact,
  street: StreetContact,
  cozy: CozyContact,
  cyber: CyberContact,
  stationnery: StationneryContact,
  food: FoodContact,
  wellness: WellnessContact,
  playful: PlayfulContact,
  activewear: ActivewearContact,
  chrono: ChronoContact,
  maison: MaisonContact,
  arena: ArenaContact
} satisfies Record<TemplateKey, Component>

export const themeProviderTemplates = {
  classic: ClassicThemeProvider,
  modern: ModernThemeProvider,
  street: StreetThemeProvider,
  cozy: CozyThemeProvider,
  cyber: CyberThemeProvider,
  stationnery: StationneryThemeProvider,
  food: FoodThemeProvider,
  wellness: WellnessThemeProvider,
  playful: PlayfulThemeProvider,
  activewear: ActivewearThemeProvider,
  chrono: ChronoThemeProvider,
  maison: MaisonThemeProvider,
  arena: ArenaThemeProvider
} satisfies Record<TemplateKey, Component>

export const productLandingPageTemplates = {
  classic: ClassicProductLandingPage,
  modern: ModernProductLandingPage,
  street: StreetProductLandingPage,
  cozy: CozyProductLandingPage,
  cyber: CyberProductLandingPage,
  stationnery: StationneryProductLandingPage,
  food: FoodProductLandingPage,
  wellness: WellnessProductLandingPage,
  playful: PlayfulProductLandingPage,
  activewear: ActivewearProductLandingPage,
  chrono: ModernProductLandingPage,
  maison: ModernProductLandingPage,
  arena: ArenaProductLandingPage
} satisfies Record<TemplateKey, Component>

export const selectTemplate = (
  templates: Record<TemplateKey, Component>,
  key?: string | null
): Component => {
  const resolved = resolveTemplateKey(key)
  return templates[resolved]
}
