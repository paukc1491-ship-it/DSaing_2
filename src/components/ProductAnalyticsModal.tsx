// src/components/ProductAnalyticsModal.tsx
'use client';

import { X } from 'lucide-react';

interface AnalyticsItem {
  id: string;
  title: string;
  value: number;
  icon: React.ReactNode;
}

interface ProductAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  data: AnalyticsItem[];
  total: number;
  onProductClick?: (productId: string) => void; // ✅ ထည့်တယ်
}

export default function ProductAnalyticsModal({
  isOpen,
  onClose,
  title,
  icon,
  data,
  total,
  onProductClick, // ✅ ထည့်တယ်
}: ProductAnalyticsModalProps) {
  if (!isOpen) return null;

  const handleProductClick = (productId: string) => {
    onClose();
    if (onProductClick) {
      onProductClick(productId);
    }
  };

  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--card-background)',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--card-border)',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: 'var(--accent)' }}>{icon}</div>
            <h2 style={{ color: 'var(--foreground)', fontSize: '18px', fontWeight: '600', margin: 0 }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-background)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Total */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--hover-background)',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
            Total
          </span>
          <span style={{ color: 'var(--accent)', fontSize: '20px', fontWeight: '700' }}>
            {total.toLocaleString()}
          </span>
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px',
          }}
        >
          {sortedData.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                padding: '40px 0',
                fontSize: '14px',
              }}
            >
              No data available
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedData.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--card-background)',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border)',
                    transition: 'all 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-background)';
                  }}
                >
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: '600',
                      minWidth: '28px',
                      flexShrink: 0,
                    }}
                  >
                    #{index + 1}
                  </span>

                  <span style={{ color: 'var(--text-muted)', fontSize: '16px', flexShrink: 0 }}>
                    {item.icon}
                  </span>

                  {/* ✅ Product Name - နှိပ်လို့ရတယ် */}
                  <span
                    onClick={() => handleProductClick(item.id)}
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                  >
                    {item.title}
                  </span>

                  <span
                    style={{
                      color: 'var(--accent)',
                      fontSize: '16px',
                      fontWeight: '700',
                      flexShrink: 0,
                      marginLeft: '12px',
                    }}
                  >
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}