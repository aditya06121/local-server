import { useEffect } from "react";

export default function Terminal() {
  useEffect(() => {
    window.location.replace("/wetty");
  }, []);

  return null;
}
