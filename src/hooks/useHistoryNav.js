import { useEffect, useCallback, useRef } from "react";

export function useHistoryNav(currentId, setCurrentId) {
  const skipPush = useRef(false);

  useEffect(() => {
    history.replaceState({ currentId }, "");
  }, []);

  useEffect(() => {
    const onPopState = (e) => {
      const id = e.state?.currentId ?? "house";
      skipPush.current = true;
      setCurrentId(id);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setCurrentId]);

  const navigateTo = useCallback((id) => {
    setCurrentId(id);
    history.pushState({ currentId: id }, "");
  }, [setCurrentId]);

  const resetTo = useCallback((id) => {
    setCurrentId(id);
    history.replaceState({ currentId: id }, "");
  }, [setCurrentId]);

  return { navigateTo, resetTo };
}
