import { useEffect } from "react";

export default function Redirect() {
  useEffect(() => {
    window.location.replace("https://nibal.ink");
  }, []);
  return <div className="p-8">Redirigiendo...</div>;
}
