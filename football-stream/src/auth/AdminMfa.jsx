import { useRef, useState } from "react";
import { enrollAdminTotp, verifyAdminTotp } from "./adminAuth";

export default function AdminMfa({ access, onBusy, inputStyle, buttonStyle }) {
  const [enrollment, setEnrollment] = useState(null);
  const [selectedFactor, setSelectedFactor] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const factorId = enrollment?.factorId || selectedFactor || access.factors[0]?.id;
  const disabled = busy || access.loading;

  async function startEnrollment() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      setEnrollment(await enrollAdminTotp(access.userId));
    } catch {
      setError("Unable to start authenticator setup. Please retry, or sign out and try again.");
      void access.refresh();
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await verifyAdminTotp(access.userId, factorId, code);
      setEnrollment(null);
      await access.refresh();
    } catch {
      setError("Unable to verify this code. Try a fresh code or sign out and sign in again.");
      void access.refresh();
    } finally {
      setCode("");
      inFlight.current = false;
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <section aria-label="Authenticator verification">
      <p style={{ color: "#94a3b8" }}>
        {access.stage === "enroll" ? "Set up your authenticator app to continue." : "Enter the code from your authenticator app."}
      </p>
      {access.stage === "enroll" && !enrollment ? (
        <button type="button" style={buttonStyle} disabled={disabled} onClick={startEnrollment}>
          {busy ? "Setting up…" : "Set up authenticator"}
        </button>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {enrollment && !access.loading && (
            <>
              <p>Scan this QR code with your authenticator app, then enter its 6-digit code.</p>
              <img src={enrollment.qr} alt="Scan to set up your authenticator" style={{ width: "100%", maxWidth: "260px", background: "white", alignSelf: "center" }} />
            </>
          )}
          {access.factors.length > 1 && !enrollment && (
            <select aria-label="Authenticator" value={factorId} onChange={(event) => setSelectedFactor(event.target.value)} disabled={disabled} style={inputStyle}>
              {access.factors.map((factor, index) => <option key={factor.id} value={factor.id}>Authenticator {index + 1}</option>)}
            </select>
          )}
          <input aria-label="6-digit verification code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={disabled}
            onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setError(""); }} style={inputStyle} />
          <button type="submit" disabled={disabled || !factorId} style={buttonStyle}>{busy ? "Verifying…" : "Verify and continue"}</button>
        </form>
      )}
      {error && <p role="alert" style={{ color: "#fda4af" }}>{error}</p>}
    </section>
  );
}
