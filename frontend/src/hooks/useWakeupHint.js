import { useEffect, useState } from "react";

export function useWakeupHint(isLoading, delay = 1800) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delay, isLoading]);

  return visible;
}
