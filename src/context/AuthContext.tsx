import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { auth, db, googleProvider, validateFirestoreConnection, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole, AccountStatus } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isAdmin: boolean;
  needsOnboarding: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  registerAsPatient: (displayName?: string, phone?: string) => Promise<void>;
  applyForProfessionalRole: (payload: {
    role: UserRole;
    displayName: string;
    licenseNumber: string;
    facilityName: string;
    governorate: string;
    phone: string;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserStatusByAdmin: (targetUid: string, newStatus: AccountStatus) => Promise<void>;
  fetchPendingUsersForAdmin: () => Promise<UserProfile[]>;
}

const SUPER_ADMIN_EMAIL = 'bcgmoc@gmail.com';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Validate connection on boot
  useEffect(() => {
    validateFirestoreConnection();
  }, []);

  const loadUserProfile = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      const adminDocRef = doc(db, 'admins', firebaseUser.uid);
      const adminSnap = await getDoc(adminDocRef);

      const isVerifiedSuperAdminEmail = 
        firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && 
        firebaseUser.emailVerified;

      if (adminSnap.exists() || isVerifiedSuperAdminEmail) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        setUserProfile(profile);
        setNeedsOnboarding(false);
        if (profile.role === 'super_admin') {
          setIsAdmin(true);
        }
      } else {
        // If user is verified super admin bootstrap
        if (isVerifiedSuperAdminEmail) {
          const now = new Date().toISOString();
          const adminProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || SUPER_ADMIN_EMAIL,
            displayName: firebaseUser.displayName || 'Super Administrator',
            role: 'super_admin',
            status: 'approved',
            createdAt: now,
            updatedAt: now,
          };

          // Save admin record and user profile
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'super_admin',
            grantedAt: now,
          });

          await setDoc(userDocRef, adminProfile);
          setUserProfile(adminProfile);
          setIsAdmin(true);
          setNeedsOnboarding(false);
        } else {
          setUserProfile(null);
          setNeedsOnboarding(true);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching user profile:', err);
      // Handled gracefully without crashing app
      setAuthError(err instanceof Error ? err.message : 'Failed to retrieve profile');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await loadUserProfile(result.user);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      console.error('Authentication Error:', errorMsg);
      setAuthError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      setNeedsOnboarding(false);
      setAuthError(null);
    } catch (err: unknown) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const registerAsPatient = async (displayName?: string, phone?: string) => {
    if (!user) throw new Error('User must be authenticated');
    setLoading(true);
    setAuthError(null);
    try {
      const now = new Date().toISOString();
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: displayName || user.displayName || 'Patient',
        role: 'patient',
        status: 'approved', // Patient access is free and immediately available
        phone: phone || '',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      setUserProfile(profile);
      setNeedsOnboarding(false);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const applyForProfessionalRole = async (payload: {
    role: UserRole;
    displayName: string;
    licenseNumber: string;
    facilityName: string;
    governorate: string;
    phone: string;
  }) => {
    if (!user) throw new Error('User must be authenticated');
    setLoading(true);
    setAuthError(null);
    try {
      const now = new Date().toISOString();
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: payload.displayName,
        role: payload.role,
        status: 'pending', // Requires administrative verification
        licenseNumber: payload.licenseNumber,
        facilityName: payload.facilityName,
        governorate: payload.governorate,
        phone: payload.phone,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      setUserProfile(profile);
      setNeedsOnboarding(false);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  const updateUserStatusByAdmin = async (targetUid: string, newStatus: AccountStatus) => {
    if (!isAdmin) throw new Error('Unauthorized administrative action');
    try {
      const targetRef = doc(db, 'users', targetUid);
      await updateDoc(targetRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      if (user && targetUid === user.uid) {
        await refreshProfile();
      }
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const fetchPendingUsersForAdmin = async (): Promise<UserProfile[]> => {
    if (!isAdmin) throw new Error('Unauthorized');
    try {
      const usersCol = collection(db, 'users');
      const snap = await getDocs(usersCol);
      return snap.docs.map((d) => d.data() as UserProfile);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        isAdmin,
        needsOnboarding,
        signInWithGoogle,
        signOut,
        clearAuthError,
        registerAsPatient,
        applyForProfessionalRole,
        refreshProfile,
        updateUserStatusByAdmin,
        fetchPendingUsersForAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
