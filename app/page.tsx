import VulnerabilityMap from "@/components/VulnerabilityMap";

export default function Home() {
  return (
    <main style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "8px 14px",
          background: "#1b1b1b",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>Firehouse GIS</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>WUI vulnerability & egress viewer</span>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <VulnerabilityMap />
      </div>
    </main>
  );
}
