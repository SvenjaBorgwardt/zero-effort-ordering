/**
 * Check plausibility of a single order position.
 * Returns: "gruen", "gelb", or "rot" with optional reason.
 */
export function pruefePosition(position) {
  const { menge, konfidenz, katalog_match, typische_menge } = position;

  // No catalog match → red
  if (!katalog_match) {
    return {
      plausibilitaet: "rot",
      grund: `Produkt "${position.produkt_name || position.produkt}" nicht im Katalog gefunden`
    };
  }

  // Very low confidence → red
  if (konfidenz < 0.5) {
    return {
      plausibilitaet: "rot",
      grund: `Sehr niedrige Erkennungssicherheit (${Math.round(konfidenz * 100)}%)`
    };
  }

  // Check quantity plausibility
  if (typische_menge) {
    const { min, max } = typische_menge;

    // Way too high → red
    if (menge > max * 10) {
      return {
        plausibilitaet: "rot",
        grund: `Menge ${menge} ist extrem hoch. Typisch: ${min}-${max} ${typische_menge.einheit}.`
      };
    }

    // Too high → yellow
    if (menge > max * 3) {
      return {
        plausibilitaet: "gelb",
        grund: `Menge ${menge} ist deutlich höher als üblich. Typisch: ${min}-${max} ${typische_menge.einheit}. Stimmt das?`
      };
    }

    // Suspiciously low → yellow
    if (menge < min / 2 && menge > 0) {
      return {
        plausibilitaet: "gelb",
        grund: `Menge ${menge} ist ungewöhnlich niedrig. Typisch: ${min}-${max} ${typische_menge.einheit}.`
      };
    }
  }

  // Medium confidence → yellow
  if (konfidenz < 0.85) {
    return {
      plausibilitaet: "gelb",
      grund: `Mittlere Erkennungssicherheit (${Math.round(konfidenz * 100)}%). Bitte prüfen.`
    };
  }

  // All good → green
  return {
    plausibilitaet: "gruen",
    grund: null
  };
}

/**
 * Check all positions in an order.
 * Returns positions enriched with plausibility info.
 */
export function pruefeAllePositionen(positionen) {
  return positionen.map(pos => {
    const check = pruefePosition(pos);
    return {
      ...pos,
      plausibilitaet: check.plausibilitaet,
      plausibilitaet_grund: check.grund,
      manuell_korrigiert: false
    };
  });
}
