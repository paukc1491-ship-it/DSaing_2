'use client';

import { useState, useRef, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, User, Mail, Lock, CheckCircle, UserRound, MapPin, Search } from 'lucide-react';
import { MYANMAR_CITIES, STATE_LIST, STATE_TRANSLATIONS, CITY_TO_STATE } from '@/data/cities';

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // 'add' ဆိုရင် အကောင့်အသစ်မဖန်တီးဘူး
  const roleParam = searchParams.get('role') as 'user' | 'seller' | null;
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'seller'>(roleParam || 'user');
  
  // ===== State & City =====
  const [selectedState, setSelectedState] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopAddressDetail, setShopAddressDetail] = useState('');

  // ===== Dropdown States =====
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');

  const stateContainerRef = useRef<HTMLDivElement>(null);
  const cityContainerRef = useRef<HTMLDivElement>(null);

  // ===== Password Show/Hide =====
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===== State List =====
  const getStates = () => {
    return STATE_LIST.map(state => ({
      key: state,
      label: STATE_TRANSLATIONS[state]?.en || state
    }));
  };

  // ===== City List =====
  const getCitiesByState = (stateKey: string) => {
    if (!stateKey) return [];
    return MYANMAR_CITIES.filter(city => CITY_TO_STATE[city] === stateKey);
  };

  // ===== ရှာဖွေမှုအတွက် Filtered Lists =====
  const filteredStates = getStates().filter(({ label }) =>
    label.toLowerCase().includes(stateSearchTerm.toLowerCase())
  );

  const filteredCities = getCitiesByState(selectedState).filter(city =>
    city.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  // ===== Click Outside =====
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateContainerRef.current && !stateContainerRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
      if (cityContainerRef.current && !cityContainerRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== State ရွေးလိုက်ရင် =====
  const handleStateSelect = (stateKey: string) => {
    setSelectedState(stateKey);
    setShopCity('');
    setCitySearchTerm('');
    setIsStateDropdownOpen(false);
  };

  // ===== City ရွေးလိုက်ရင် =====
  const handleCitySelect = (city: string) => {
    setShopCity(city);
    setCitySearchTerm(city);
    setIsCityDropdownOpen(false);
  };

  // ===== ✅ Username နဲ့ Email ကို စစ်ဆေးတဲ့ function =====
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const q = query(collection(db, 'users'), where('username', '==', username.trim()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    const q = query(collection(db, 'users'), where('email', '==', email.trim()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validation
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      setLoading(false);
      return;
    }

    // ✅ Username ရှိပြီးသားလား စစ်ပါ
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      setError('This username is already taken. Please choose another one.');
      setLoading(false);
      return;
    }

    // ✅ Email ရှိပြီးသားလား စစ်ပါ
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      setError('This email is already registered. Please login.');
      setLoading(false);
      return;
    }

    if (role === 'seller') {
      if (!selectedState) {
        setError('Please select your shop state/region');
        setLoading(false);
        return;
      }
      if (!shopCity) {
        setError('Please select your shop city');
        setLoading(false);
        return;
      }
      if (shopAddressDetail.trim().length < 2) {
        setError('Please enter your shop address details');
        setLoading(false);
        return;
      }
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // ✅ mode=add ဆိုရင် အကောင့်အသစ်မဖန်တီးဘူး (ဒါပေမယ့် ခုက သီးသန့်အကောင့်ဖြစ်တာမို့ mode=add ကိုမသုံးတော့ဘူး)
      // အကောင့်အသစ်ပဲ ဖန်တီးမယ်
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const fullAddress = role === 'seller' 
        ? `${shopAddressDetail.trim()}, ${shopCity}, ${selectedState}` 
        : null;

      await setDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
        displayName: username.trim(),
        photoURL: null,
        shopAddress: fullAddress,
        shopState: role === 'seller' ? selectedState : null,
        shopCity: role === 'seller' ? shopCity : null,
        shopAddressDetail: role === 'seller' ? shopAddressDetail.trim() : null
      });

      await signOut(auth);
      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create account');
      }
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#121212',
          border: '1px solid #262626',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '420px',
          width: '100%'
        }}
      >
        <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Create Account
        </h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: '0 0 24px 0' }}>
          Join D Saing marketplace
        </p>

        {success && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <CheckCircle size={20} style={{ color: '#22c55e' }} />
            <div>
              <div style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600' }}>
                Account created successfully!
              </div>
              <div style={{ color: '#888888', fontSize: '12px', marginTop: '2px' }}>
                Redirecting to login...
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px'
            }}
          >
            <span style={{ color: '#ef4444', fontSize: '13px' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp}>
          {/* Username */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Username
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1a1a1a',
                border: '1px solid #262626',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              <UserRound size={18} style={{ color: '#666666', marginRight: '10px' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
                disabled={loading || success}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1a1a1a',
                border: '1px solid #262626',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              <Mail size={18} style={{ color: '#666666', marginRight: '10px' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading || success}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1a1a1a',
                border: '1px solid #262626',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              <Lock size={18} style={{ color: '#666666', marginRight: '10px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                disabled={loading || success}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#666666',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Confirm Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1a1a1a',
                border: '1px solid #262626',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              <Lock size={18} style={{ color: '#666666', marginRight: '10px' }} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading || success}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#666666',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              I want to
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}
            >
              <button
                type="button"
                onClick={() => setRole('user')}
                disabled={loading || success}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: role === 'user' ? '2px solid #38bdf8' : '1px solid #262626',
                  backgroundColor: role === 'user' ? '#1a1a1a' : 'transparent',
                  color: role === 'user' ? '#ffffff' : '#888888',
                  cursor: loading || success ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '13px',
                  opacity: loading || success ? 0.5 : 1,
                  boxSizing: 'border-box'
                }}
              >
                <User size={16} style={{ display: 'block', margin: '0 auto 4px auto' }} />
                Buy Products
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                disabled={loading || success}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: role === 'seller' ? '2px solid #38bdf8' : '1px solid #262626',
                  backgroundColor: role === 'seller' ? '#1a1a1a' : 'transparent',
                  color: role === 'seller' ? '#ffffff' : '#888888',
                  cursor: loading || success ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '13px',
                  opacity: loading || success ? 0.5 : 1,
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ fontSize: '18px', display: 'block' }}>🏪</span>
                Sell Products
              </button>
            </div>
          </div>

          {/* Shop Address - ရောင်းသူမှပဲပြမယ် */}
          {role === 'seller' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                Shop Address *
              </label>

              {/* ===== STATE DROPDOWN ===== */}
              <div ref={stateContainerRef} style={{ position: 'relative', marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <MapPin size={18} style={{ color: '#666666', marginRight: '10px', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={stateSearchTerm}
                    onFocus={() => setIsStateDropdownOpen(true)}
                    onChange={(e) => {
                      setStateSearchTerm(e.target.value);
                      setIsStateDropdownOpen(true);
                      if (e.target.value === '') {
                        setSelectedState('');
                        setShopCity('');
                      }
                    }}
                    placeholder="Select State / Region..."
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {isStateDropdownOpen && (
                  <div style={{ 
                    position: 'absolute', 
                    zIndex: 10, 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #262626', 
                    borderRadius: '8px', 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}>
                    {filteredStates.length > 0 ? (
                      filteredStates.map(({ key, label }) => (
                        <div
                          key={key}
                          onClick={() => {
                            setSelectedState(key);
                            setStateSearchTerm(label);
                            setShopCity('');
                            setCitySearchTerm('');
                            setIsStateDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            color: selectedState === key ? '#38bdf8' : '#ffffff',
                            fontSize: '14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #262626',
                            backgroundColor: selectedState === key ? '#1a1a1a' : 'transparent'
                          }}
                        >
                          {label}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px 12px', color: '#666666', fontSize: '14px' }}>
                        No states found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ===== CITY DROPDOWN ===== */}
              <div ref={cityContainerRef} style={{ position: 'relative', marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    cursor: selectedState ? 'pointer' : 'default',
                    boxSizing: 'border-box',
                    opacity: selectedState ? 1 : 0.5
                  }}
                >
                  <MapPin size={18} style={{ color: '#666666', marginRight: '10px', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={citySearchTerm || shopCity}
                    onFocus={() => {
                      if (selectedState) setIsCityDropdownOpen(true);
                    }}
                    onChange={(e) => {
                      if (selectedState) {
                        setCitySearchTerm(e.target.value);
                        setIsCityDropdownOpen(true);
                      }
                    }}
                    placeholder={selectedState ? "Search your city..." : "Please select state first"}
                    disabled={!selectedState}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: selectedState ? '#ffffff' : '#666666',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {isCityDropdownOpen && selectedState && (
                  <div style={{ 
                    position: 'absolute', 
                    zIndex: 10, 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #262626', 
                    borderRadius: '8px', 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}>
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <div
                          key={city}
                          onClick={() => handleCitySelect(city)}
                          style={{
                            padding: '10px 12px',
                            color: shopCity === city ? '#38bdf8' : '#ffffff',
                            fontSize: '14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #262626',
                            backgroundColor: shopCity === city ? '#1a1a1a' : 'transparent'
                          }}
                        >
                          {city}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px 12px', color: '#666666', fontSize: '14px' }}>
                        No cities found for this state
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Address Detail */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #262626',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  boxSizing: 'border-box',
                  marginTop: '4px'
                }}
              >
                <input
                  type="text"
                  value={shopAddressDetail}
                  onChange={(e) => setShopAddressDetail(e.target.value)}
                  placeholder="e.g., 123 Main Street, Ward 4"
                  required
                  disabled={loading || success}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ color: '#666666', fontSize: '11px', marginTop: '4px' }}>
                Your shop address will be displayed on your products
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: success ? '#22c55e' : '#ffffff',
              color: success ? '#ffffff' : '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '15px',
              cursor: loading || success ? 'default' : 'pointer',
              opacity: loading || success ? 0.7 : 1,
              transition: 'all 0.3s ease',
              boxSizing: 'border-box'
            }}
          >
            {loading ? 'Creating account...' : success ? '✓ Account Created!' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <span style={{ color: '#888888', fontSize: '14px' }}>
            Already have an account?{' '}
            <a
              href="/login"
              style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '500' }}
            >
              Login
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}