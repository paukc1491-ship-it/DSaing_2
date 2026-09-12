// src/app/admin/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Search, Package, CheckCircle, XCircle, Clock, Truck } from 'lucide-react';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchOrders();
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(orderList);
      setFilteredOrders(orderList);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    let filtered = orders;
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(o =>
        o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  if (loading) return <div style={{ padding: '24px', color: 'var(--foreground)' }}>Loading...</div>;
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', color: 'var(--foreground)' }}>
        <ShieldAlert size={48} color="var(--error)" />
        <h2>Access Denied</h2>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Go Home</button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    if (status === 'CONFIRMED') return <CheckCircle size={16} color="var(--success)" />;
    if (status === 'CANCELLED') return <XCircle size={16} color="var(--error)" />;
    if (status === 'DELIVERED') return <Truck size={16} color="var(--accent)" />;
    return <Clock size={16} color="#f59e0b" />;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Order Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>အော်ဒါအားလုံးကို စီမံရန်နေရာ</p>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Order ID / Buyer / Seller ဖြင့် ရှာပါ..."
            style={{ width: '100%', padding: '10px 14px 10px 40px', backgroundColor: 'var(--input-background)', border: '1px solid var(--input-border)', borderRadius: '8px', color: 'var(--foreground)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', backgroundColor: 'var(--input-background)', border: '1px solid var(--input-border)', borderRadius: '8px', color: 'var(--foreground)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No orders found</div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} style={{ padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={16} /> Order #{order.id?.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Buyer: {order.buyerName || 'N/A'} | Seller: {order.storeName || order.sellerName || 'N/A'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                  {getStatusIcon(order.status)}
                  <span style={{ color: order.status === 'CONFIRMED' ? 'var(--success)' : order.status === 'CANCELLED' ? 'var(--error)' : '#f59e0b' }}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px', marginBottom: '12px' }}>
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                    <span>{item.productTitle} (x{item.quantity})</span>
                    <span>{Number(item.total || 0).toLocaleString()} MMK</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginTop: '8px', color: 'var(--accent)' }}>
                  <span>Total:</span>
                  <span>{Number(order.totalAmount || 0).toLocaleString()} MMK</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {order.status === 'PENDING' && (
                  <button onClick={() => updateOrderStatus(order.id, 'CONFIRMED')} style={{ padding: '6px 12px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    Confirm
                  </button>
                )}
                {order.status === 'CONFIRMED' && (
                  <button onClick={() => updateOrderStatus(order.id, 'DELIVERED')} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    Mark Delivered
                  </button>
                )}
                {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                  <button onClick={() => updateOrderStatus(order.id, 'CANCELLED')} style={{ padding: '6px 12px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}