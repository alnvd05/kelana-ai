"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <head><title>Something went wrong | KelanaAI</title></head>
      <body style={{ margin: 0, background: "#081a1c", color: "#f6eedd", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, boxSizing: "border-box" }}>
          <section style={{ maxWidth: 480, textAlign: "center" }}>
            <p style={{ color: "#f3c769", letterSpacing: "0.2em" }}>KELANA AI</p>
            <h1>Let’s find our way back.</h1>
            <p>Something went wrong while opening the app. Please try again.</p>
            <button type="button" onClick={retry} style={{ marginTop: 20, padding: "14px 24px", background: "#f3c769", color: "#081a1c", border: 0, borderRadius: 32, fontSize: 16, cursor: "pointer" }}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
