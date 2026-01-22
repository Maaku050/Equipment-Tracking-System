// hooks/useOverdueChecker.ts
import { useEffect, useRef } from "react";
import { updateOverdueTransactions } from "@/_helpers/firebaseHelpers";

/**
 * Hook to automatically check and update overdue transactions
 * Call this in your main app component or transaction list components
 *
 * @param intervalMinutes - How often to check (default: 60 minutes)
 * @param checkOnMount - Whether to check immediately when component mounts (default: true)
 */
export function useOverdueChecker(
  intervalMinutes: number = 60,
  checkOnMount: boolean = true,
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkOverdue = async () => {
    try {
      const updatedCount = await updateOverdueTransactions();
      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} overdue transactions`);
      }
    } catch (error) {
      console.error("Error checking overdue transactions:", error);
    }
  };

  useEffect(() => {
    // Check immediately on mount if enabled
    if (checkOnMount) {
      checkOverdue();
    }

    // Set up interval to check periodically
    intervalRef.current = setInterval(
      () => {
        checkOverdue();
      },
      intervalMinutes * 60 * 1000,
    );

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes, checkOnMount]);

  // Return manual trigger function in case you need it
  return { checkOverdue };
}

/**
 * Alternative: Component that you can add to your app root
 * Usage: <OverdueChecker intervalMinutes={60} />
 */
import React from "react";

interface OverdueCheckerProps {
  intervalMinutes?: number;
  checkOnMount?: boolean;
}

export function OverdueChecker({
  intervalMinutes = 60,
  checkOnMount = true,
}: OverdueCheckerProps) {
  useOverdueChecker(intervalMinutes, checkOnMount);
  return null; // This component doesn't render anything
}

/**
 * Usage examples:
 *
 * 1. In your App.tsx or main layout:
 * ```tsx
 * import { OverdueChecker } from '@/hooks/useOverdueChecker';
 *
 * function App() {
 *   return (
 *     <>
 *       <OverdueChecker intervalMinutes={30} />
 *       {/* rest of your app *\/}
 *     </>
 *   );
 * }
 * ```
 *
 * 2. In a specific screen/component:
 * ```tsx
 * import { useOverdueChecker } from '@/hooks/useOverdueChecker';
 *
 * function TransactionsScreen() {
 *   const { checkOverdue } = useOverdueChecker(60, true);
 *
 *   // You can manually trigger if needed
 *   const handleRefresh = async () => {
 *     await checkOverdue();
 *     // reload your transactions
 *   };
 *
 *   return (
 *     // your UI
 *   );
 * }
 * ```
 *
 * 3. Manual check on specific actions:
 * ```tsx
 * import { updateOverdueTransactions } from '@/_helpers/firebaseHelpers';
 *
 * async function onViewTransactions() {
 *   await updateOverdueTransactions();
 *   // then load transactions
 * }
 * ```
 */
