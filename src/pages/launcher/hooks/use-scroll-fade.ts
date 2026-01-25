import { useCallback, useState } from "react";

export function useScrollFade(
  ref: React.RefObject<HTMLElement | null>,
  initialTop = false,
  initialBottom = true,
) {
  const [showTopFade, setShowTopFade] = useState(initialTop);
  const [showBottomFade, setShowBottomFade] = useState(initialBottom);

  const checkScroll = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowTopFade(scrollTop > 10);
    setShowBottomFade(scrollTop < scrollHeight - clientHeight - 10);
  }, [ref]);

  return { showTopFade, showBottomFade, checkScroll };
}
