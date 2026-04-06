// ============================================================
// config.js
// Single source of truth for column layout in "clean data"
// Update these if the sheet structure ever changes.
// ============================================================

// ── clean data column ranges ─────────────────────────────────

const COL = {
  // Provider identifier
  EMAIL:              5,   // E

  // State licensures  (L : BJ)
  LICENSE_START:      12,  // L
  LICENSE_END:        62,  // BJ

  // Conditions / specialties  (BK : FA)
  CONDITIONS_START:   63,  // BK
  CONDITIONS_END:     157, // FA
  CONDITIONS_COUNT:   95,  // FA - BK + 1

  // Weekly schedule  (FC : FI)
  SCHEDULE_START:     159, // FC
  SCHEDULE_COUNT:     7,   // Mon – Sun

  // Availability status
  AVAILABILITY:       175, // FS
};

// ── providers bio output columns ─────────────────────────────

const BIO_COL = {
  WEEKLY_AVAIL:       5,   // E
  ACTIVE_STATES:      9,   // I
  SPECIALTIES:        11,  // K
  ABLE_WILLING:       12,  // L

  // Platform tag output columns
  HEALTHPROFS:        18,  // R
  HEALTHGRADES:       19,  // S
  ZOCDOC:             20,  // T
  WEBMD:              21,  // U
  HEALTHIE:           22,  // V
};
