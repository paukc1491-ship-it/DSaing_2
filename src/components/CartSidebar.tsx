'use client';

import { X, ShoppingBag, Trash2, Plus, Minus } from "lucide-react";

interface CartItem {
  id: number;
  brand: string;
  title: string;
  price: string;
  image: string;
  quantity: number;
  location: string;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: number, change: number) => void;
  onRemoveItem: (id: number) => void;
}

export default function CartSidebar({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem
}: CartSidebarProps) {
  if (!isOpen) return null;

  // စုစုပေါင်းတွက်မယ်
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const price = parseInt(item.price.replace(/,/g, '').replace(' MMK', ''));
    return sum + (price * item.quantity);
  }, 0);

  // ဆိုင်အလိုက် အုပ်စုဖွဲ့မယ်
  const groupedByLocation = cartItems.reduce((groups: any, item) => {
    const location = item.location;
    if (!groups[location]) {
      groups[location] = [];
    }
    groups[location].push(item);
    return groups;
  }, {});

  const formatPrice = (price: number) => {
    return price.toLocaleString() + ' MMK';
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease"
        }}
        onClick={onClose}
      />

      {/* Cart Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "380px",
          maxWidth: "90vw",
          backgroundColor: "#0a0a0a",
          borderLeft: "1px solid #1a1a1a",
          zIndex: 9999,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.8)"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShoppingBag size={20} style={{ color: "#38bdf8" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#ffffff" }}>
              My Cart ({totalItems})
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#1e1e1e",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cart Items */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
          {cartItems.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#666666",
                gap: "12px"
              }}
            >
              <ShoppingBag size={48} style={{ color: "#333333" }} />
              <p style={{ fontSize: "16px", margin: 0 }}>Your cart is empty</p>
              <button
                onClick={onClose}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 24px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            // ဆိုင်အလိုက် အုပ်စုဖွဲ့ပြမယ်
            Object.keys(groupedByLocation).map((location) => (
              <div key={location}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#38bdf8",
                    marginBottom: "8px",
                    borderBottom: "1px solid #1a1a1a",
                    paddingBottom: "6px"
                  }}
                >
                  📍 {location}
                </div>
                {groupedByLocation[location].map((item: CartItem) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "10px 0",
                      borderBottom: "1px solid #121212"
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#38bdf8" }}>
                        {item.brand}
                      </div>
                      <div style={{ fontSize: "13px", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#22c55e" }}>
                        {item.price}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          style={{
                            backgroundColor: "#1e1e1e",
                            border: "none",
                            color: "#ffffff",
                            borderRadius: "4px",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer"
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: "13px", color: "#ffffff", minWidth: "20px", textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          style={{
                            backgroundColor: "#1e1e1e",
                            border: "none",
                            color: "#ffffff",
                            borderRadius: "4px",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer"
                          }}
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            marginLeft: "auto",
                            padding: "4px"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer - Checkout */}
        {cartItems.length > 0 && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid #1a1a1a",
              flexShrink: 0,
              backgroundColor: "#0a0a0a"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px"
              }}
            >
              <span style={{ color: "#888888", fontSize: "14px" }}>Total</span>
              <span style={{ color: "#ffffff", fontSize: "18px", fontWeight: "700" }}>
                {formatPrice(totalPrice)}
              </span>
            </div>
            <button
              style={{
                width: "100%",
                backgroundColor: "#ffffff",
                color: "#000000",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontWeight: "600",
                fontSize: "15px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <ShoppingBag size={18} />
              Proceed to Checkout
            </button>
            <div
              style={{
                fontSize: "11px",
                color: "#666666",
                textAlign: "center",
                marginTop: "8px"
              }}
            >
              Items from different shops will be ordered separately
            </div>
          </div>
        )}
      </div>
    </>
  );
}