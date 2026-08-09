import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/shared/types';
import { authService } from '@/frontend/services/authService';

interface BranchState {
    // 1. Global App State
    currentUser: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // 2. UI State
    searchQuery: string;
    isMobileMenuOpen: boolean;
    bookingLrNumber: string;

    // 3. Actions
    setCurrentUser: (user: User | null) => void;
    setSearchQuery: (query: string) => void;
    setBookingLrNumber: (lr: string) => void;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;

    // 4. Booking Context
    currentLR: string | null;
    setLR: (lr: string | null) => void;

    // 5. Theme
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}

export const useBranchStore = create<BranchState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            isLoading: false,
            isAuthenticated: false,
            searchQuery: "",
            isMobileMenuOpen: false,
            bookingLrNumber: "",
            currentLR: null,
            theme: 'light',

            setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user, isLoading: false }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setBookingLrNumber: (lr) => set({ bookingLrNumber: lr }),
            toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
            closeMobileMenu: () => set({ isMobileMenuOpen: false }),
            setTheme: (theme) => {
                set({ theme });
                if (typeof window !== 'undefined') {
                    if (theme === 'dark') {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            },

            logout: async () => {
                set({ isLoading: true });
                await authService.logout();
                set({ currentUser: null, isAuthenticated: false, isLoading: false });
            },

            checkSession: async () => {
                // Remove early return to allow session/permission updates on mount
                set({ isLoading: !get().currentUser }); 
                const { data: { session } } = await authService.getSession();
                if (session) {
                    const user = await authService.getCurrentUser();
                    set({ currentUser: user, isAuthenticated: !!user, isLoading: false });
                } else {
                    set({ currentUser: null, isAuthenticated: false, isLoading: false });
                }
            },

            setLR: (lr) => set({ currentLR: lr }),
        }),
        {
            name: 'parcel-system-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                currentUser: state.currentUser,
                isAuthenticated: state.isAuthenticated,
                bookingLrNumber: state.bookingLrNumber,
                theme: state.theme
            }),
        }
    )
);

