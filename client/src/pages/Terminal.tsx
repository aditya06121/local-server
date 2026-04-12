export default function Terminal() {
  return (
    <iframe
      src="/wetty"
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
