import { PASSWORD_RULES } from "../lib/passwordRules";
import "./PasswordChecklist.css";

type PasswordChecklistProps = {
  id: string;
  password: string;
  confirm: string;
};

/**
 * Ticks off each password rule as the analyst types, and says whether the two
 * passwords match. Each line uses an icon and words, never colour alone.
 */
export function PasswordChecklist({ id, password, confirm }: PasswordChecklistProps) {
  const met = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strength = password.length === 0 ? "empty" : met <= 2 ? "weak" : met === 3 ? "fair" : "strong";
  const strengthLabel = { empty: "", weak: "Weak", fair: "Almost there", strong: "Strong" }[strength];

  return (
    <div id={id} className="pw-check">
      <div className="pw-check__meter" aria-hidden="true">
        {PASSWORD_RULES.map((r, i) => (
          <span key={r.id} className={`pw-check__bar ${i < met ? `pw-check__bar--${strength}` : ""}`} />
        ))}
      </div>
      {strengthLabel && <p className={`pw-check__strength pw-check__strength--${strength}`}>{strengthLabel}</p>}

      <ul className="pw-check__list" aria-label="Password requirements">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={ok ? "pw-check__item pw-check__item--ok" : "pw-check__item"}>
              <span className="pw-check__icon" aria-hidden="true">
                {ok ? "✓" : "•"}
              </span>
              {r.label}
              <span className="visually-hidden">{ok ? " (done)" : " (not yet)"}</span>
            </li>
          );
        })}
        {confirm.length > 0 && (
          <li
            className={password === confirm ? "pw-check__item pw-check__item--ok" : "pw-check__item pw-check__item--bad"}
            aria-live="polite"
          >
            <span className="pw-check__icon" aria-hidden="true">
              {password === confirm ? "✓" : "✕"}
            </span>
            {password === confirm ? "Passwords match" : "Passwords don't match yet"}
          </li>
        )}
      </ul>
    </div>
  );
}
