'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import { ArrowLeft, ClipboardList, FileText, Search, X } from 'lucide-react';
import { getNextReceiptNumber } from '@/lib/ReceiptNumber';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  buyerId?: string;
  buyerName?: string;
  customerName?: string;
  customerPhone?: string;
  items?: Array<{ productTitle?: string; quantity?: number; total?: number }>;
  totalAmount?: number;
  deliveryAddress?: string;
  paymentMethod?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptNumber?: string;
  receiptYear?: number;
  receiptIssuedAt?: any;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DELIVERED';
  createdAt?: any;
}

interface Buyer {
  username?: string;
  displayName?: string;
  name?: string;
  phone?: string;
  email?: string;
}

const formatDate = (value: any) => {
  if (!value) return 'Date unavailable';
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

const formatAmount = (amount?: number) => `${Number(amount || 0).toLocaleString()} MMK`;

export default function SellerOrdersPage() {
  const router = useRouter();
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyers, setBuyers] = useState<Record<string, Buyer>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Order['status']>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sellerData, setSellerData] = useState<{ shopName?: string; shopAddress?: string; shopPhone?: string }>({});
  const [selectedReceipt, setSelectedReceipt] = useState<(Order & { buyerName?: string }) | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const getDate = (value: any) => {
    if (!value) return null;
    const date = value.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const userSnapshot = await getDoc(doc(db, 'users', user.uid));
      if (!userSnapshot.exists() || !['seller', 'VENDOR'].includes(userSnapshot.data().role)) {
        router.push('/');
        return;
      }
      setSellerId(user.uid);
      setSellerData(userSnapshot.data());
    });
  }, [router]);

  useEffect(() => {
    if (!sellerId) return;

    const ordersQuery = query(collection(db, 'orders'), where('sellerId', '==', sellerId));
    return onSnapshot(ordersQuery, (snapshot) => {
      const nextOrders = snapshot.docs
        .map((orderSnapshot) => ({ id: orderSnapshot.id, ...orderSnapshot.data() } as Order))
        .sort((first, second) => {
          const firstTime = first.createdAt?.toMillis?.() || new Date(first.createdAt || 0).getTime();
          const secondTime = second.createdAt?.toMillis?.() || new Date(second.createdAt || 0).getTime();
          return secondTime - firstTime;
        });
      setOrders(nextOrders);
      setLoading(false);
      setError('');
    }, (snapshotError) => {
      console.error('Failed to load order history:', snapshotError);
      setError('Unable to load order history.');
      setLoading(false);
    });
  }, [sellerId]);

  const openReceipt = async (order: Order) => {
    if (!sellerId || receiptLoading) return;
    setReceiptLoading(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      const year = new Date().getFullYear();
      let receiptNumber = order.receiptNumber;
      let receiptIssuedAt = order.receiptIssuedAt;

      await runTransaction(db, async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists()) throw new Error('Order no longer exists.');
        const currentOrder = orderSnapshot.data() as Order;
        if (currentOrder.receiptNumber) {
          receiptNumber = currentOrder.receiptNumber;
          receiptIssuedAt = currentOrder.receiptIssuedAt;
          return;
        }

        const nextReceipt = await getNextReceiptNumber(transaction, db, sellerId, year);
        receiptNumber = nextReceipt.number;
        receiptIssuedAt = new Date();
        transaction.update(orderRef, {
          receiptNumber,
          receiptYear: year,
          receiptIssuedAt: new Date(),
          storeName: sellerData.shopName || 'Store',
          storeAddress: sellerData.shopAddress || 'Address not provided',
          storePhone: sellerData.shopPhone || 'Phone not provided',
        });
      });

      const buyer = order.buyerId ? buyers[order.buyerId] : undefined;
      setSelectedReceipt({
        ...order,
        receiptNumber,
        receiptYear: order.receiptYear || year,
        receiptIssuedAt,
        storeName: order.storeName || sellerData.shopName || 'Store',
        storeAddress: order.storeAddress || sellerData.shopAddress || 'Address not provided',
        storePhone: order.storePhone || sellerData.shopPhone || 'Phone not provided',
        buyerName: order.buyerName || order.customerName || buyer?.username || buyer?.displayName || buyer?.name || 'Buyer',
      });
    } catch (receiptError) {
      console.error('Failed to create receipt:', receiptError);
      setError('Unable to create receipt.');
    } finally {
      setReceiptLoading(false);
    }
  };

  useEffect(() => {
    const buyerIds = [...new Set(orders.map((order) => order.buyerId).filter(Boolean))] as string[];
    if (buyerIds.length === 0) return;

    Promise.all(buyerIds.map(async (buyerId) => [buyerId, await getDoc(doc(db, 'users', buyerId))] as const))
      .then((results) => {
        const nextBuyers: Record<string, Buyer> = {};
        results.forEach(([buyerId, snapshot]) => {
          if (snapshot.exists()) nextBuyers[buyerId] = snapshot.data() as Buyer;
        });
        setBuyers((current) => ({ ...current, ...nextBuyers }));
      })
      .catch((buyerError) => console.error('Failed to load buyer information:', buyerError));
  }, [orders]);

  const visibleOrders = orders.filter((order) => {
    const buyer = order.buyerId ? buyers[order.buyerId] : undefined;
    const buyerText = [
      order.buyerName,
      order.customerName,
      buyer?.username,
      buyer?.displayName,
      buyer?.name,
    ].join(' ').toLowerCase();
    const matchesSearch = !searchTerm.trim() || buyerText.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--foreground)', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link href="/seller/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Order History</h1>
        </header>

        <section style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              value={searchTerm} 
              onChange={(event) => setSearchTerm(event.target.value)} 
              placeholder="Search buyer information" 
              style={{ 
                width: '100%', 
                boxSizing: 'border-box', 
                padding: '10px 12px 10px 38px', 
                backgroundColor: 'var(--input-background)', 
                border: '1px solid var(--input-border)', 
                borderRadius: '8px', 
                color: 'var(--foreground)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | Order['status'])} 
            style={{ 
              flex: '0 1 160px', 
              padding: '10px', 
              backgroundColor: 'var(--input-background)', 
              border: '1px solid var(--input-border)', 
              borderRadius: '8px', 
              color: 'var(--foreground)',
              outline: 'none'
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </section>

        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading orders...</p> : error ? <p style={{ color: 'var(--error)' }}>{error}</p> : visibleOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
            <ClipboardList size={42} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>No orders found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border)' }}>
                  {['Order', 'Buyer', 'Phone', 'Items', 'Date', 'Status', 'Total', 'Delivery address', 'Payment', 'Receipt'].map((heading) => (
                    <th key={heading} style={{ padding: '14px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const buyer = order.buyerId ? buyers[order.buyerId] : undefined;
                  const buyerName = order.buyerName || order.customerName || buyer?.username || buyer?.displayName || buyer?.name || 'Unknown buyer';
                  const phone = order.customerPhone || buyer?.phone || 'Not provided';
                  const status = order.status || 'PENDING';
                  const statusColor = status === 'CONFIRMED' || status === 'DELIVERED' ? 'var(--success)' : status === 'CANCELLED' ? 'var(--error)' : '#facc15';
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{order.id.slice(0, 8)}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--foreground)', fontWeight: 600 }}>{buyerName}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{phone}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', minWidth: '180px' }}>
                        {(order.items || []).map((item, index) => <div key={`${order.id}-${index}`}>{item.productTitle || 'Product'} x {item.quantity || 0}</div>)}
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(order.createdAt)}</td>
                      <td style={{ padding: '14px 12px' }}><span style={{ color: statusColor, fontWeight: 700 }}>{status}</span></td>
                      <td style={{ padding: '14px 12px', color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatAmount(order.totalAmount)}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', maxWidth: '220px' }}>{order.deliveryAddress || 'Not provided'}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{order.paymentMethod || 'Not provided'}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <button 
                          onClick={() => openReceipt(order)} 
                          disabled={receiptLoading} 
                          title="Open receipt" 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '5px', 
                            padding: '7px 9px', 
                            backgroundColor: 'var(--accent)', 
                            color: '#000', 
                            border: 'none', 
                            borderRadius: '7px', 
                            cursor: receiptLoading ? 'wait' : 'pointer', 
                            fontWeight: 600 
                          }}
                        >
                          <FileText size={15} /> {order.receiptNumber || 'Open'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReceipt && (() => {
        const receiptDate = getDate(selectedReceipt.receiptIssuedAt) || getDate(selectedReceipt.createdAt) || new Date();
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <section style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--card-background)', color: 'var(--foreground)', padding: '28px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--card-border)', paddingBottom: '16px', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, color: 'var(--foreground)' }}>{selectedReceipt.storeName}</h2>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedReceipt.storeAddress}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedReceipt.storePhone}</div>
                </div>
                <button 
                  onClick={() => setSelectedReceipt(null)} 
                  title="Close receipt" 
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--foreground)' }}
                >
                  <X size={22} />
                </button>
              </header>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Receipt No.</strong>
                  <div style={{ color: 'var(--foreground)' }}>{selectedReceipt.receiptNumber}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Date and Time</strong>
                  <div style={{ color: 'var(--foreground)' }}>{receiptDate.toLocaleString()}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Buyer</strong>
                  <div style={{ color: 'var(--foreground)' }}>{selectedReceipt.buyerName}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Phone</strong>
                  <div style={{ color: 'var(--foreground)' }}>{selectedReceipt.customerPhone || 'Not provided'}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Delivery Address</strong>
                  <div style={{ color: 'var(--foreground)' }}>{selectedReceipt.deliveryAddress || 'Not provided'}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Payment Method</strong>
                  <div style={{ color: 'var(--foreground)' }}>{selectedReceipt.paymentMethod || 'Not provided'}</div>
                </div>
              </div>
              <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', color: 'var(--foreground)' }}>Items</h3>
              {(selectedReceipt.items || []).map((item, index) => (
                <div key={`${selectedReceipt.id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', color: 'var(--text-secondary)' }}>
                  <span>{item.productTitle || 'Product'} x {item.quantity || 0}</span>
                  <span>{Number(item.total || 0).toLocaleString()} MMK</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid var(--card-border)', marginTop: '8px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--foreground)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent)' }}>{Number(selectedReceipt.totalAmount || 0).toLocaleString()} MMK</span>
              </div>
              <p style={{ textAlign: 'center', margin: '28px 0 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>Thank you for your purchase!</p>
            </section>
          </div>
        );
      })()}
    </main>
  );
}