export default function Terminal() {
  const wettyUrl = `http://${window.location.hostname}:3001`;

  return (
    <iframe
      src={wettyUrl}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        zIndex: 1300,
      }}
      title="Terminal"
    />
  );
}
