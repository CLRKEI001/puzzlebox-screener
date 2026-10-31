export function isDuplicateStudent(list, s) {
  const norm = (v) => String(v || "").trim().toLowerCase();
  return list.some(
    (e) =>
      norm(e.firstName) === norm(s.firstName) &&
      norm(e.lastName) === norm(s.lastName) &&
      e.dob === s.dob
  );
}

export function validateLogin(email, password) {
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  const passwordOk = String(password || "").length >= 6;
  if (!emailOk) return { valid: false, error: "Please enter a valid email address." };
  if (!passwordOk) return { valid: false, error: "Password must be at least 6 characters." };
  return { valid: true, error: null };
}

export function calcScore(sectionScores) {
  return {
    score: sectionScores.reduce((a, b) => a + b, 0),
    total: sectionScores.length,
  };
}

export function anonymiseId(child) {
  return String(child.id).toUpperCase().replace(/[^A-Z0-9]/g, "");
}