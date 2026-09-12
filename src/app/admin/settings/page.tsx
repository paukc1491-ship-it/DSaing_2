// app/admin/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  ArrowLeft, 
  User, 
  Save,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const SettingsField = ({
  label,
  field,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  noRestriction = false,
  getCanChangeStatus,
  getNextChangeDate,
  translate,
  formatDate,
}: any) => {
  const canChangeField = noRestriction ? true : getCanChangeStatus(field);
  const nextDate = noRestriction ? null : getNextChangeDate(field);

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '500' }}>
          {label} {required && '*'}
        </label>
        {!noRestriction && !canChangeField && nextDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '10px', fontWeight: '500' }}>
            <Clock size={12} />
            <span>{translate('availableOn')} {formatDate(nextDate)}</span>
          </div>
        )}
      </div>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled || !canChangeField}
        style={{ width: '100%', padding: '8px 12px', backgroundColor: canChangeField ? 'var(--input-background)' : 'var(--card-background)', border: canChangeField ? '1px solid var(--input-border)' : '1px solid var(--card-border)', borderRadius: '6px', color: canChangeField ? 'var(--foreground)' : 'var(--text-muted)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', cursor: canChangeField ? 'text' : 'not-allowed' }}
      />

      {!noRestriction && !canChangeField && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10px', marginTop: '3px' }}>
          <AlertCircle size={12} />
          <span>{translate('thirtyDayRule')}</span>
        </div>
      )}
      {canChangeField && !noRestriction && <div style={{ color: 'var(--success)', fontSize: '10px', marginTop: '3px' }}>✓ {translate('availableNow')}</div>}
    </div>
  );
};

const AccordionSection = ({ title, icon: Icon, children, isOpen, onToggle }: any) => (
  <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--card-background)' }}>
    <button
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', backgroundColor: isOpen ? 'var(--hover-background)' : 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '13px', fontWeight: isOpen ? '600' : '500', cursor: 'pointer', transition: 'background 0.2s' }}
    >
      <Icon size={16} color="var(--accent)" />
      <span>{title}</span>
    </button>
    {isOpen && <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid var(--card-border)', backgroundColor: 'var(--background)' }}>{children}</div>}
  </div>
);

export default function AdminSettings() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [openSection, setOpenSection] = useState<'profile' | 'preferences' | null>('profile');

  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: ''
  });

  const [canChange, setCanChange] = useState({
    username: true,
    phone: true,
  });

  const [nextChangeDate, setNextChangeDate] = useState({
    username: null as string | null,
    phone: null as string | null,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUser(user);
          const userRef = doc(db, 'users', user.uid);
          const snapshot = await getDoc(userRef);
          
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.role !== 'admin') {
              router.push('/');
              return;
            }
            setUserData(data);
            
            setFormData({
              username: data.username || '',
              phone: data.phone || '',
              email: user.email || ''
            });

            checkCanChange('username', data.lastUsernameChange);
            checkCanChange('phone', data.lastPhoneChange);
          } else {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  const checkCanChange = (field: keyof typeof canChange, lastChangeDate?: string) => {
    if (!lastChangeDate) {
      setCanChange(prev => ({ ...prev, [field]: true }));
      setNextChangeDate(prev => ({ ...prev, [field]: null }));
      return;
    }

    const lastChangeMs = new Date(lastChangeDate).getTime();
    if (Number.isNaN(lastChangeMs)) {
      setCanChange(prev => ({ ...prev, [field]: true }));
      setNextChangeDate(prev => ({ ...prev, [field]: null }));
      return;
    }

    const nowMs = Date.now();
    const nextChangeMs = lastChangeMs + 30 * 24 * 60 * 60 * 1000;
    const isAvailable = nowMs >= nextChangeMs;

    setCanChange(prev => ({ ...prev, [field]: isAvailable }));
    setNextChangeDate(prev => ({
      ...prev,
      [field]: isAvailable ? null : new Date(nextChangeMs).toISOString()
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'my' ? 'my' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {};
      const now = new Date().toISOString();

      const username = formData.username.trim();
      const currentUsername = userData?.username || '';

      if (username !== currentUsername) {
        if (!username) throw new Error('Username cannot be empty');
        if (!canChange.username) throw new Error('Username can only be changed once every 30 days.');
        
        updateData.username = username;
        updateData.lastUsernameChange = now;
      }

      if (Object.keys(updateData).length === 0) {
        setError('No changes made');
        setSaving(false);
        return;
      }

      await updateDoc(userRef, updateData);
      setUserData({ ...userData, ...updateData });
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => router.back()}
                style={{
                  color: 'var(--accent)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
              <ArrowLeft size={18} />
            </button>
            <h1 style={{ color: 'var(--foreground)', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              Admin Settings
            </h1>
          </div>
          <ThemeToggle />
        </div>

        {success && (
          <div style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--success)', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> <span>{success}</span>
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--error)', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', color: 'var(--error)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AccordionSection
            title="Admin Profile Settings"
            icon={User}
            isOpen={openSection === 'profile'}
            onToggle={() => setOpenSection(openSection === 'profile' ? null : 'profile')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '12px' }}>
              <SettingsField
                label="Username"
                field="username"
                value={formData.username}
                onChange={(val: string) => setFormData({ ...formData, username: val })}
                placeholder="Admin username"
                getCanChangeStatus={(f: string) => canChange.username}
                getNextChangeDate={(f: string) => nextChangeDate.username}
                translate={t}
                formatDate={formatDate}
                required
              />

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="System & Role Info"
            icon={Shield}
            isOpen={openSection === 'preferences'}
            onToggle={() => setOpenSection(openSection === 'preferences' ? null : 'preferences')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--card-background)', borderRadius: '8px', border: '1px solid var(--card-border)', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={16} color="#ef4444" />
                <div>
                  <div style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: '500' }}>Account Level</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Full Administrator Access</div>
                </div>
              </div>
              <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>Admin</div>
            </div>
          </AccordionSection>
        </div>

        <div style={{ marginTop: '18px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--accent)',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}