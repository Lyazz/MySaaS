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

// Interior Imports
import InteriorCategory from './interior/Category.vue'
import InteriorContact from './interior/ContactPage.vue'
import InteriorAbout from './interior/AboutPage.vue'
import InteriorCheckout from './interior/Checkout.vue'
import InteriorHome from './interior/Home.vue'
import InteriorProduct from './interior/Product.vue'
import InteriorProductCard from './interior/ProductCard.vue'
import InteriorShop from './interior/Shop.vue'
import InteriorStoreShell from './interior/StoreShell.vue'
import InteriorThemeProvider from './interior/ThemeProvider.vue'
import InteriorCart from './interior/Cart.vue'
import InteriorProductLandingPage from './interior/ProductLandingPage.vue'

// Minimal Imports
import MinimalCategory from './minimal/Category.vue'
import MinimalContact from './minimal/ContactPage.vue'
import MinimalAbout from './minimal/AboutPage.vue'
import MinimalCheckout from './minimal/Checkout.vue'
import MinimalHome from './minimal/Home.vue'
import MinimalProduct from './minimal/Product.vue'
import MinimalProductCard from './minimal/ProductCard.vue'
import MinimalShop from './minimal/Shop.vue'
import MinimalStoreShell from './minimal/StoreShell.vue'
import MinimalThemeProvider from './minimal/ThemeProvider.vue'
import MinimalCart from './minimal/Cart.vue'
import MinimalProductLandingPage from './minimal/ProductLandingPage.vue'

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

// Nour Imports
import NourHome from './nour/Home.vue'
import NourStoreShell from './nour/StoreShell.vue'
import NourThemeProvider from './nour/ThemeProvider.vue'
import NourCategory from './nour/Category.vue'
import NourContact from './nour/ContactPage.vue'
import NourAbout from './nour/AboutPage.vue'
import NourCheckout from './nour/Checkout.vue'
import NourProduct from './nour/Product.vue'
import NourProductCard from './nour/ProductCard.vue'
import NourShop from './nour/Shop.vue'
import NourCart from './nour/Cart.vue'
import NourProductLandingPage from './nour/ProductLandingPage.vue'

// Embellir Imports
import EmbellirHome from './embellir/Home.vue'
import EmbellirStoreShell from './embellir/StoreShell.vue'
import EmbellirThemeProvider from './embellir/ThemeProvider.vue'
import EmbellirCategory from './embellir/Category.vue'
import EmbellirContact from './embellir/ContactPage.vue'
import EmbellirAbout from './embellir/AboutPage.vue'
import EmbellirCheckout from './embellir/Checkout.vue'
import EmbellirProduct from './embellir/Product.vue'
import EmbellirProductCard from './embellir/ProductCard.vue'
import EmbellirShop from './embellir/Shop.vue'
import EmbellirCart from './embellir/Cart.vue'
import EmbellirProductLandingPage from './embellir/ProductLandingPage.vue'

import ModernProductLandingPage from './modern/ProductLandingPage.vue'
import ClassicProductLandingPage from './classic/ProductLandingPage.vue'
import StreetProductLandingPage from './street/ProductLandingPage.vue'
import CozyProductLandingPage from './cozy/ProductLandingPage.vue'
import CyberProductLandingPage from './cyber/ProductLandingPage.vue'
import StationneryProductLandingPage from './stationnery/ProductLandingPage.vue'
import FoodProductLandingPage from './food/ProductLandingPage.vue'
import WellnessProductLandingPage from './wellness/ProductLandingPage.vue'

// Wishlist: playful, wellness and street define their own; everything else keeps the shared one.
import WishlistDefault from '~/components/storefront/shared/WishlistDefault.vue'
import WellnessWishlist from './wellness/Wishlist.vue'
import StreetWishlist from './street/Wishlist.vue'
import PlayfulWishlist from './playful/Wishlist.vue'
import PlayfulProductLandingPage from './playful/ProductLandingPage.vue'
import ActivewearProductLandingPage from './activewear/ProductLandingPage.vue'

/**
 * The one list of shipped themes. Anything that needs to enumerate templates --
 * the onboarding gallery, the preview iframe, appearance settings -- reads this
 * rather than keeping its own copy; the copies had already drifted to 11 and 15
 * entries against the 17 that actually exist.
 */
export const TEMPLATE_KEYS = [
  'classic', 'modern', 'interior', 'minimal', 'street', 'cozy', 'cyber', 'stationnery',
  'food', 'wellness', 'playful', 'activewear', 'chrono', 'maison', 'arena', 'nour', 'embellir'
] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]
export const DEFAULT_TEMPLATE: TemplateKey = 'modern'

export const resolveTemplateKey = (value?: string | null): TemplateKey =>
  TEMPLATE_KEYS.includes(value as TemplateKey) ? (value as TemplateKey) : DEFAULT_TEMPLATE

export const homeTemplates = {
  classic: ClassicHome,
  modern: ModernHome,
  interior: InteriorHome,
  minimal: MinimalHome,
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
  arena: ArenaHome,
  nour: NourHome,
  embellir: EmbellirHome
} satisfies Record<TemplateKey, Component>

export const productTemplates = {
  classic: ClassicProduct,
  modern: ModernProduct,
  interior: InteriorProduct,
  minimal: MinimalProduct,
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
  arena: ArenaProduct,
  nour: NourProduct,
  embellir: EmbellirProduct
} satisfies Record<TemplateKey, Component>

export const productCardTemplates = {
  classic: ClassicProductCard,
  modern: ModernProductCard,
  interior: InteriorProductCard,
  minimal: MinimalProductCard,
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
  arena: ArenaProductCard,
  nour: NourProductCard,
  embellir: EmbellirProductCard
} satisfies Record<TemplateKey, Component>

export const categoryTemplates = {
  classic: ClassicCategory,
  modern: ModernCategory,
  interior: InteriorCategory,
  minimal: MinimalCategory,
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
  arena: ArenaCategory,
  nour: NourCategory,
  embellir: EmbellirCategory
} satisfies Record<TemplateKey, Component>

export const storeShellTemplates = {
  classic: ClassicStoreShell,
  modern: ModernStoreShell,
  interior: InteriorStoreShell,
  minimal: MinimalStoreShell,
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
  arena: ArenaStoreShell,
  nour: NourStoreShell,
  embellir: EmbellirStoreShell
} satisfies Record<TemplateKey, Component>

export const shopTemplates = {
  classic: ClassicShop,
  modern: ModernShop,
  interior: InteriorShop,
  minimal: MinimalShop,
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
  arena: ArenaShop,
  nour: NourShop,
  embellir: EmbellirShop
} satisfies Record<TemplateKey, Component>

export const checkoutTemplates = {
  classic: ClassicCheckout,
  modern: ModernCheckout,
  interior: InteriorCheckout,
  minimal: MinimalCheckout,
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
  arena: ArenaCheckout,
  nour: NourCheckout,
  embellir: EmbellirCheckout
} satisfies Record<TemplateKey, Component>

export const cartTemplates = {
  classic: ClassicCart,
  modern: ModernCart,
  interior: InteriorCart,
  minimal: MinimalCart,
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
  arena: ArenaCart,
  nour: NourCart,
  embellir: EmbellirCart
} satisfies Record<TemplateKey, Component>

export const aboutPageTemplates = {
  classic: ClassicAbout,
  modern: ModernAbout,
  interior: InteriorAbout,
  minimal: MinimalAbout,
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
  arena: ArenaAbout,
  nour: NourAbout,
  embellir: EmbellirAbout
} satisfies Record<TemplateKey, Component>

export const contactPageTemplates = {
  classic: ClassicContact,
  modern: ModernContact,
  interior: InteriorContact,
  minimal: MinimalContact,
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
  arena: ArenaContact,
  nour: NourContact,
  embellir: EmbellirContact
} satisfies Record<TemplateKey, Component>

export const themeProviderTemplates = {
  classic: ClassicThemeProvider,
  modern: ModernThemeProvider,
  interior: InteriorThemeProvider,
  minimal: MinimalThemeProvider,
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
  arena: ArenaThemeProvider,
  nour: NourThemeProvider,
  embellir: EmbellirThemeProvider
} satisfies Record<TemplateKey, Component>

export const productLandingPageTemplates = {
  classic: ClassicProductLandingPage,
  modern: ModernProductLandingPage,
  interior: InteriorProductLandingPage,
  minimal: MinimalProductLandingPage,
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
  arena: ArenaProductLandingPage,
  nour: NourProductLandingPage,
  embellir: EmbellirProductLandingPage
} satisfies Record<TemplateKey, Component>

export const selectTemplate = (
  templates: Record<TemplateKey, Component>,
  key?: string | null
): Component => {
  const resolved = resolveTemplateKey(key)
  return templates[resolved]
}

export const wishlistTemplates = {
  classic: WishlistDefault,
  modern: WishlistDefault,
  interior: WishlistDefault,
  minimal: WishlistDefault,
  street: StreetWishlist,
  cozy: WishlistDefault,
  cyber: WishlistDefault,
  stationnery: WishlistDefault,
  food: WishlistDefault,
  wellness: WellnessWishlist,
  playful: PlayfulWishlist,
  activewear: WishlistDefault,
  chrono: WishlistDefault,
  maison: WishlistDefault,
  arena: WishlistDefault,
  nour: WishlistDefault,
  embellir: WishlistDefault
} as const
