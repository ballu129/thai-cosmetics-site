"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  increaseQuantity: (slug: string) => void;
  decreaseQuantity: (slug: string) => void;
  removeFromCart: (slug: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "siam-care-cart";

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const savedCart = window.localStorage.getItem(STORAGE_KEY);

        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);

          if (Array.isArray(parsedCart)) {
            setItems(parsedCart);
          }
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isLoaded]);

  function addToCart(item: Omit<CartItem, "quantity">) {
    setItems((current) => {
      const existing = current.find(
        (currentItem) => currentItem.slug === item.slug
      );

      if (existing) {
        return current.map((currentItem) =>
          currentItem.slug === item.slug
            ? {
                ...currentItem,
                quantity: currentItem.quantity + 1,
              }
            : currentItem
        );
      }

      return [
        ...current,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQuantity(slug: string) {
    setItems((current) =>
      current.map((item) =>
        item.slug === slug
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseQuantity(slug: string) {
    setItems((current) =>
      current
        .map((item) =>
          item.slug === slug
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(slug: string) {
    setItems((current) =>
      current.filter((item) => item.slug !== slug)
    );
  }

  function clearCart() {
    setItems([]);
  }

  const value = useMemo(
    () => ({
      items,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
    }),
    [items]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
