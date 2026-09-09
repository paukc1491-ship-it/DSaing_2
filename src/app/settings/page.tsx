'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import NotificationToggle from '@/components/NotificationToggle';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail,
  Save,
  Camera,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Bell
} from 'lucide-react';

interface UserData {
  username?: string;
  phone?: string;
  email?: string;
  role?: string;
  lastUsernameChange?: string;
  lastPhoneChange?: string;
  language?: string;
  notifications?: {
    chatMessages?: boolean;
  };
  [key: string]: any; 
}

const SettingsField = ({
  label,
  field,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  rows,
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

      {rows ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || !canChangeField}
          style={{ width: '100%', padding: '8px 12px', backgroundColor: canChangeField ? 'var(--input-background)' : 'var(--card-background)', border: canChangeField ? '1px solid var(--input-border)' : '1px solid var(--card-border)', borderRadius: '6px', color: canChangeField ? 'var(--foreground)' : 'var(--text-muted)', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', cursor: canChangeField ? 'text' : 'not-allowed' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || !canChangeField}
          style={{ width: '100%', padding: '8px 12px', backgroundColor: canChangeField ? 'var(--input-background)' : 'var(--card-background)', border: canChangeField ? '1px solid var(--input-border)' : '1px solid var(--card-border)', borderRadius: '6px', color: canChangeField ? 'var(--foreground)' : 'var(--text-muted)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', cursor: canChangeField ? 'text' : 'not-allowed' }}
        />
      )}

      {!noRestriction && !canChangeField && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10px', marginTop: '3px' }}>
          <AlertCircle size={12} />
          <span>{translate('thirtyDayRule')}</span>
        </div>
      )}
      {canChangeField && !noRestriction && <div style={{ color: 'var(--success)', fontSize: '10px', marginTop: '3px' }}>✓ {translate('availableNow')}</div>}
      {noRestriction && <div style={{ color: 'var(--success)', fontSize: '10px', marginTop: '3px' }}>✓ {translate('alwaysAvailable')}</div>}
    </div>
  );
};

const AccordionSection = ({ title, icon: Icon, children, isOpen, onToggle }: any) => (
  <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--card-background)' }}>
    <button
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', backgroundColor: isOpen ? 'var(--hover-background)' : 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '13px', fontWeight: isOpen ? '600' : '500', cursor: 'pointer', transition: 'background 0.2s' }}
      onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = 'var(--hover-background)'; }}
      onMouseLeave={(event) => { if (!isOpen) event.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Icon size={16} color="var(--accent)" />
      <span>{title}</span>
    </button>
    {isOpen && <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid var(--card-border)', backgroundColor: 'var(--background)' }}>{children}</div>}
  </div>
);

export default function BuyerSettings() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [openSection, setOpenSection] = useState<'profile' | 'preferences' | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: ''
  });

  const [notifications, setNotifications] = useState({
    chatMessages: true
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
            setUserData(data);
            
            setFormData({
              username: data.username || '',
              phone: data.phone || '',
              email: user.email || ''
            });

            setNotifications({
              chatMessages: data.notifications?.chatMessages ?? true
            });

            checkCanChange('username', data.lastUsernameChange);
            checkCanChange('phone', data.lastPhoneChange);
                        
          } else {
            const newUserData = {
              username: user.displayName || user.email?.split('@')[0] || 'User',
              phone: '',
              role: 'user',
              email: user.email || '',
              createdAt: new Date().toISOString(),
              language: 'en',
              notifications: {
                chatMessages: true
              }
            };
            
            await setDoc(userRef, newUserData);
            setUserData(newUserData);
            setFormData({
              username: newUserData.username,
              phone: newUserData.phone,
              email: user.email || ''
            });
            
            setCanChange({
              username: true,
              phone: true,
            });
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

  const getCanChangeStatus = (field: string) => {
    return canChange[field as keyof typeof canChange];
  };

  const getNextChangeDate = (field: string) => {
    return nextChangeDate[field as keyof typeof nextChangeDate];
  };

  const handleSave = async () => {
    if (!user) {
      setError('Please login first');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {};
      const now = new Date().toISOString();

      updateData.language = language;
      updateData.notifications = notifications;

      const fields = [
        { key: 'username', value: formData.username, dbField: 'lastUsernameChange', label: 'Username' },
        { key: 'phone', value: formData.phone, dbField: 'lastPhoneChange', label: 'Phone' }
      ];

      for (const field of fields) {
        const currentValue = userData ? (userData[field.key] || '') : '';
        const newValue = field.value?.trim() || '';

        if (newValue !== currentValue) {
          if (!newValue) {
            throw new Error(`${field.label} cannot be empty`);
          }

          if (!getCanChangeStatus(field.key)) {
            const nextDate = getNextChangeDate(field.key);
            if (!nextDate) {
              throw new Error(`${field.label} can only be changed once every 30 days.`);
            }
            throw new Error(`${field.label} can only be changed once every 30 days. Next available on ${formatDate(nextDate)}`);
          }

          updateData[field.key] = newValue;
          updateData[field.dbField] = now;
        }
      }

      if (Object.keys(updateData).length === 0) {
        setError(t('noChanges'));
        setSaving(false);
        return;
      }

      await updateDoc(userRef, updateData);
      
      const updatedUserData = {
        ...(userData || {}),
        ...updateData
      };
      setUserData(updatedUserData);

      for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(updateData, field.key)) {
          checkCanChange(field.key as keyof typeof canChange, now);
        }
      }

      setSuccess(t('saved'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--foreground)'
      }}>
        {t('loading')}
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--foreground)',
        gap: '16px',
        padding: '20px'
      }}>
        <div style={{ color: 'var(--error)', fontSize: '20px' }}>⚠️ Error</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--accent)',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link 
              href="/" 
              style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 style={{ color: 'var(--foreground)', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              {language === 'my' ? 'ဆက်တင်များ' : 'Settings'}
            </h1>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <ThemeToggle />
          </div>
        </div>

        {success && (
          <div style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--success)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '12px',
            color: 'var(--success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--error)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '12px',
            color: 'var(--error)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Profile Section */}
          <AccordionSection
            id="profile"
            title={language === 'my' ? 'ပရိုဖိုင်' : 'Profile'}
            icon={User}
            isOpen={openSection === 'profile'}
            onToggle={() => setOpenSection(openSection === 'profile' ? null : 'profile')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '12px' }}>
              <SettingsField
                label={language === 'my' ? 'အသုံးပြုသူအမည်' : 'Username'}
                field="username"
                value={formData.username}
                onChange={(val: string) => setFormData({ ...formData, username: val })}
                placeholder={language === 'my' ? 'သင့်အမည်ပြရန်' : 'Your display name'}
                getCanChangeStatus={getCanChangeStatus}
                getNextChangeDate={getNextChangeDate}
                translate={t}
                formatDate={formatDate}
                required
              />

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>
                  {language === 'my' ? 'အီးမေးလ်' : 'Email'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <SettingsField
                label={language === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone'}
                field="phone"
                value={formData.phone}
                onChange={(val: string) => setFormData({ ...formData, phone: val })}
                placeholder={language === 'my' ? '၀၉ ၁၂၃ ၄၅၆ ၇၈၉' : '09 123 456 789'}
                getCanChangeStatus={getCanChangeStatus}
                getNextChangeDate={getNextChangeDate}
                translate={t}
                formatDate={formatDate}
                type="tel"
              />              
            </div>
          </AccordionSection>

          {/* Preferences Section */}
          <AccordionSection
            id="preferences"
            title={language === 'my' ? 'ကြိုက်နှစ်သက်မှုများ' : 'Preferences'}
            icon={Shield}
            isOpen={openSection === 'preferences'}
            onToggle={() => setOpenSection(openSection === 'preferences' ? null : 'preferences')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
              
              {/* Notifications Section */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--card-background)',
                borderRadius: '8px',
                border: '1px solid var(--card-border)'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: '500' }}>
                    <Bell size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    {language === 'my' ? 'အကြောင်းကြားချက်များ' : 'Notifications'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <NotificationToggle
                    label={language === 'my' ? 'ချက်ဘောက်စာဝင်သည်' : 'Chat Messages'}
                    checked={notifications.chatMessages}
                    onChange={() => setNotifications({
                      ...notifications,
                      chatMessages: !notifications.chatMessages
                    })}
                  />
                </div>
              </div>

              {/* Account Type */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--card-background)',
                borderRadius: '8px',
                border: '1px solid var(--card-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={16} color="var(--text-secondary)" />
                  <div>
                    <div style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'my' ? 'အကောင့်အမျိုးအစား' : 'Account Type'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {language === 'my' ? 'ဝယ်ယူသူ' : 'Buyer'}
                    </div>
                  </div>
                </div>
                <div style={{ color: 'var(--accent)', fontSize: '12px' }}>
                  Basic
                </div>
              </div>
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
              gap: '6px',
              boxSizing: 'border-box',
              transition: 'opacity 0.2s'
            }}
          >
            <Save size={16} />
            {saving ? (language === 'my' ? 'သိမ်းနေသည်...' : 'Saving...') : (language === 'my' ? 'သိမ်းမည်' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}