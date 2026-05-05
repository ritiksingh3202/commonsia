/**
 * Architecture-relevance filter for RSS-pulled forum posts.
 *
 * Returns true if the item is likely useful to someone in architecture,
 * planning, design, or allied disciplines.
 *
 * Priority order:
 *  1. Explicit architecture / design / planning mention  → always include
 *  2. Allied fields (sustainability, heritage, smart cities, etc.) → include
 *  3. Explicit non-architecture discipline restriction   → skip
 *  4. Default                                           → include
 *     (over-include beats missing a real opportunity)
 *
 * Sources marked archFocused: true (Bustler, ArchDaily, Dezeen, Bee Breeders)
 * bypass this filter entirely — they are 100% architecture by definition.
 */
export function isArchitectureRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();

  // ── 1. Core architecture / design / planning ──────────────────────────────
  if (
    /\barch(itecture|itectural|itect)?\b/.test(text) ||
    /\b(b\.?arch|m\.?arch|b\.?plan|m\.?plan|b\.?des|m\.?des|b\.?f\.?a|m\.?f\.?a)\b/.test(text) ||
    /\burban\s+(design|planning|development|studies|renewal|regeneration|morphology)\b/.test(text) ||
    /\bcity\s+(planning|design|building)\b/.test(text) ||
    /\btown\s+planning\b/.test(text) ||
    /\bspatial\s+(planning|analysis|design)\b/.test(text) ||
    /\blandscape\s+(architecture|design|planning)\b/.test(text) ||
    /\binterior\s+(design|architecture|space)\b/.test(text) ||
    /\bbuilt\s+environment\b/.test(text) ||
    /\bbuilding\s+(design|technology|science|performance|envelope|systems)\b/.test(text) ||
    /\bconservation\s+(architecture|of\s+built)\b/.test(text) ||
    /\bheritage\s+(conservation|preservation|building|structure)\b/.test(text) ||
    /\bvernacular\s+(architecture|design|building)\b/.test(text) ||
    /\bhousing\s+(design|policy|development|project|scheme)\b/.test(text) ||
    /\baffordable\s+housing\b/.test(text) ||
    /\bslum\s+(rehabilitation|redevelopment|upgrading)\b/.test(text) ||
    /\bmaster\s*plan\b/.test(text) ||
    /\bsite\s+(planning|design|analysis)\b/.test(text) ||
    /\bstudio\s+(project|brief|critique|design)\b/.test(text) ||
    /\bportfolio\s+(review|design|architecture)\b/.test(text) ||
    /\bparametric\s+(design|modelling|architecture)\b/.test(text) ||
    /\bcomputational\s+(design|architecture|fabrication)\b/.test(text) ||
    /\bdigital\s+fabrication\b/.test(text) ||
    /\brhino\b|\brevit\b|\bsketchup\b|\bautocad\b|\bBIM\b/.test(text) ||
    /\bgrasshopper\b/.test(text) ||
    /\bneuro.?architecture\b/.test(text)
  ) {
    return true;
  }

  // ── 2. Allied & multidisciplinary fields ──────────────────────────────────
  if (
    // Sustainability / energy
    /\bsustainable\s+(design|development|architecture|building|city|cities|urbanism)\b/.test(text) ||
    /\bgreen\s+(building|architecture|design|infrastructure|city)\b/.test(text) ||
    /\b(net\s*zero|carbon\s*neutral|zero\s*energy|passive\s*house|passive\s*design)\b/.test(text) ||
    /\b(LEED|GRIHA|BREEAM|WELL\s+building)\b/.test(text) ||
    /\benergy\s+(efficiency|performance|modelling)\s*(in|of)?\s*(building|architecture|design)/.test(text) ||
    /\bclimate.?responsive\s+design\b/.test(text) ||
    /\bbiophilic\s+(design|architecture)\b/.test(text) ||
    // Technology & smart cities
    /\bsmart\s+(city|cities|building|infrastructure)\b/.test(text) ||
    /\b(GIS|geographic\s+information)\b/.test(text) ||
    /\burban\s+(data|analytics|technology|tech)\b/.test(text) ||
    // Materials & structures
    /\bstructural\s+(design|engineering\s+for|system)\b/.test(text) ||
    /\bconstruction\s+(management|technology|innovation|material)\b/.test(text) ||
    /\bbuilding\s+material\b/.test(text) ||
    // Humanities & policy
    /\barchitectural\s+(history|theory|criticism|research|education|thesis|dissertation)\b/.test(text) ||
    /\burban\s+(policy|governance|economics|sociology|ecology|resilience|heat\s+island)\b/.test(text) ||
    /\bland\s+(use|zoning|acquisition)\b/.test(text) ||
    /\badaptive\s+reuse\b/.test(text) ||
    /\bpublic\s+space\b/.test(text) ||
    /\bwalkability\b/.test(text) ||
    /\btransit.?oriented\s+development\b/.test(text) ||
    // Design (product / industrial — borderline but included)
    /\bindustrial\s+design\b/.test(text) ||
    /\bproduct\s+design\b/.test(text) ||
    /\bdesign\s+(thinking|research|innovation|fellowship|competition|award|scholarship)\b/.test(text) ||
    // Real estate / development
    /\breal\s+estate\s+(development|finance|management)\b/.test(text) ||
    /\bproperty\s+development\b/.test(text) ||
    // Environmental
    /\benvironmental\s+(design|planning|impact|assessment)\b/.test(text)
  ) {
    return true;
  }

  // ── 3. Explicit non-architecture disciplines → skip ───────────────────────
  // Only exclude when the restriction is clear — never exclude on a vague match.

  // Medical / health (unless it's health infrastructure or hospital design)
  if (
    /\b(mbbs|md\s+degree|medical\s+college|nursing|dentistry|dental\s+college|pharmacy\s+college|ayurveda|homeopathy)\b/.test(text) &&
    !/\b(hospital\s+design|healthcare\s+(architecture|facility|infrastructure)|medical\s+architecture)\b/.test(text)
  ) {
    return false;
  }

  // Agriculture / veterinary / life sciences
  if (
    /\b(agronomy|horticulture|veterinary|animal\s+husbandry|fisheries|sericulture|dairy\s+science)\b/.test(text) &&
    !/\b(agri.?architecture|agri.?tourism|food\s+(design|architecture))\b/.test(text)
  ) {
    return false;
  }

  // Law (unless urban law or housing policy)
  if (
    /\b(llb|law\s+(school|college|degree)|jurisprudence|bar\s+council|advocate|legal\s+studies)\b/.test(text) &&
    !/\b(urban\s+law|property\s+law|land\s+law|building\s+regulation|planning\s+law|housing\s+policy)\b/.test(text)
  ) {
    return false;
  }

  // Pure biological / chemical sciences
  if (
    /\b(microbiology|biotechnology|biochemistry|genetics|genomics|molecular\s+biology|pharmacology|toxicology)\b/.test(text) &&
    !/\b(biomimicry|bio.?inspired\s+design|biological\s+architecture)\b/.test(text)
  ) {
    return false;
  }

  // Pure finance / accounting (unless real estate finance or construction)
  if (
    /\b(chartered\s+accountant|ca\s+final|cost\s+accountant|actuarial|investment\s+banking|equity\s+research)\b/.test(text)
  ) {
    return false;
  }

  // Journalism / mass media
  if (
    /\b(journalism|mass\s+communication|broadcasting|media\s+studies|public\s+relations\s+degree)\b/.test(text) &&
    !/\b(architectural\s+journalism|design\s+media|architecture\s+photography)\b/.test(text)
  ) {
    return false;
  }

  // Pure IT / computer science (unless design-tech adjacent)
  if (
    /\b(computer\s+science\s+(degree|fellowship|scholarship)|software\s+engineering\s+(degree|fellowship)|information\s+technology\s+fellowship)\b/.test(text) &&
    !/\b(computational\s+design|smart\s+cit|BIM|digital\s+fabrication|architectural\s+technology)\b/.test(text)
  ) {
    return false;
  }

  // ── 4. Default: include ────────────────────────────────────────────────────
  return true;
}
