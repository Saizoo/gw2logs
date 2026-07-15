// Real community build catalog, ported verbatim from the previous
// Hero-Panel raid planner (snowcrows.com build guides). Do not add,
// remove, or "correct" entries without checking against snowcrows.com —
// these are curated meta builds, not something to guess at.

export type ProfessionKey = 'guard' | 'rev' | 'war' | 'eng' | 'rang' | 'thief' | 'ele' | 'mes' | 'nec';
export type BuildCategory = 'pdps' | 'cdps' | 'qdps' | 'adps' | 'qheal' | 'aheal' | 'tank' | 'kiter';

export interface BuildEntry {
  /** Stable id derived from the guide URL path — safe to store/reference, unlike a raw array index. */
  id: string;
  p: ProfessionKey;
  cat: BuildCategory;
  name: string;
  weapons: string;
  url: string;
}

const B = 'https://snowcrows.com/builds/raids/';

function build(p: ProfessionKey, cat: BuildCategory, name: string, weapons: string, path: string): BuildEntry {
  return { id: path, p, cat, name, weapons, url: B + path };
}

export const BUILDS: BuildEntry[] = [
  // ELEMENTALIST — Tempest
  build('ele', 'adps', 'Celestial Alacrity Tempest', 'Scepter & Warhorn', 'elementalist/celestial-alacrity-tempest-scepter-warhorn'),
  build('ele', 'adps', 'Condition Alacrity Tempest', 'Scepter & Warhorn', 'elementalist/condition-alacrity-tempest-scepter-warhorn'),
  build('ele', 'adps', 'Condition Alacrity Tempest', 'Pistol & Warhorn', 'elementalist/condition-alacrity-tempest-pistol-warhorn'),
  build('ele', 'adps', 'Condition Alacrity Tempest', 'Fire Only - Scepter & Focus', 'elementalist/condition-alacrity-tempest-fire-only-scepter-focus'),
  build('ele', 'cdps', 'Condition Tempest', 'Pistol & Warhorn', 'elementalist/condition-tempest-pistol-warhorn'),
  build('ele', 'cdps', 'Condition Tempest', 'Scepter & Warhorn', 'elementalist/condition-tempest-scepter-warhorn'),
  build('ele', 'aheal', 'Heal Alacrity Tempest', 'Dagger & Warhorn', 'elementalist/heal-alacrity-tempest-dagger-warhorn'),
  build('ele', 'pdps', 'Inferno Tempest', 'Scepter & Dagger', 'elementalist/inferno-tempest-scepter-dagger'),
  build('ele', 'adps', 'Power Alacrity Tempest', 'Hammer', 'elementalist/power-alacrity-tempest-hammer'),
  build('ele', 'adps', 'Power Alacrity Tempest', 'Sword & Dagger', 'elementalist/power-alacrity-tempest-sword-dagger'),
  build('ele', 'pdps', 'Power Tempest', 'Scepter & Dagger', 'elementalist/power-tempest-scepter-dagger'),
  build('ele', 'pdps', 'Power Tempest', 'Hammer', 'elementalist/power-tempest-hammer'),
  build('ele', 'pdps', 'Power Tempest', 'Sword & Dagger', 'elementalist/power-tempest-sword-dagger'),
  build('ele', 'pdps', 'Power Tempest', 'Spear', 'elementalist/power-tempest-spear'),
  // ELEMENTALIST — Weaver
  build('ele', 'cdps', 'Condition Weaver', 'Pistol & Dagger', 'elementalist/condition-weaver-pistol-dagger'),
  build('ele', 'cdps', 'Condition Weaver', 'Pistol & Warhorn', 'elementalist/condition-weaver-pistol-warhorn'),
  build('ele', 'cdps', 'Condition Weaver', 'Scepter & Warhorn', 'elementalist/condition-weaver-scepter-warhorn'),
  build('ele', 'pdps', 'Power Weaver', 'Sword & Dagger', 'elementalist/power-weaver-sword-dagger'),
  build('ele', 'pdps', 'Power Weaver', 'Spear', 'elementalist/power-weaver-spear'),
  // ELEMENTALIST — Catalyst
  build('ele', 'cdps', 'Condition Catalyst', 'Pistol & Dagger', 'elementalist/condition-catalyst-pistol-dagger'),
  build('ele', 'qdps', 'Condition Quickness Catalyst', 'Pistol & Dagger', 'elementalist/condition-quickness-catalyst-pistol-dagger'),
  build('ele', 'qdps', 'Condition Quickness Catalyst', 'Pistol & Warhorn', 'elementalist/condition-quickness-catalyst-pistol-warhorn'),
  build('ele', 'qheal', 'Heal Quickness Catalyst', 'Staff', 'elementalist/heal-quickness-catalyst-staff'),
  build('ele', 'pdps', 'Inferno Catalyst', 'Scepter & Dagger', 'elementalist/inferno-catalyst-scepter-dagger'),
  build('ele', 'pdps', 'Power Catalyst', 'Scepter & Dagger', 'elementalist/power-catalyst-scepter-dagger'),
  build('ele', 'pdps', 'Power Catalyst', 'Spear', 'elementalist/power-catalyst-spear'),
  build('ele', 'pdps', 'Power Catalyst', 'Sword & Dagger', 'elementalist/power-catalyst-sword-dagger'),
  build('ele', 'qdps', 'Power Quickness Catalyst', 'Scepter & Dagger', 'elementalist/power-quickness-catalyst-scepter-dagger'),
  build('ele', 'qdps', 'Power Quickness Catalyst', 'Sword & Dagger', 'elementalist/power-quickness-catalyst-sword-dagger'),
  // ELEMENTALIST — Evoker
  build('ele', 'adps', 'Condition Alacrity Evoker', 'Pistol & Warhorn', 'elementalist/condition-alacrity-evoker-pistol-warhorn'),
  build('ele', 'cdps', 'Condition Evoker Specialized Elements', 'Scepter & Focus', 'elementalist/condition-evoker-specialized-elements'),
  build('ele', 'qdps', 'Condition Quickness Evoker Specialized Elements', 'Scepter & Focus', 'elementalist/condition-quickness-evoker-specialized-elements'),
  build('ele', 'aheal', 'Heal Alacrity Evoker', 'Staff', 'elementalist/heal-alacrity-evoker-otter'),
  build('ele', 'pdps', 'Power Evoker', 'Hare - Scepter & Dagger', 'elementalist/power-evoker-scepter-dagger'),

  // GUARDIAN — Dragonhunter
  build('guard', 'pdps', 'Power Dragonhunter', 'Radiance — Spear / Greatsword', 'guardian/power-dragonhunter-radiance-spear-greatsword'),
  build('guard', 'pdps', 'Power Dragonhunter', 'Radiance - Longbow / Greatsword', 'guardian/power-dragonhunter-radiance-longbow-greatsword'),
  // GUARDIAN — Firebrand
  build('guard', 'qdps', 'Celestial Quickness Firebrand', 'Staff / Axe & Torch', 'guardian/celestial-quickness-firebrand-staff-axe-torch'),
  build('guard', 'cdps', 'Condition Firebrand', 'Axe & Torch / Pistol & Pistol', 'guardian/condition-firebrand-axe-torch-pistol-pistol'),
  build('guard', 'qdps', 'Condition Quickness Firebrand', 'Pistol & Pistol / Axe & Torch', 'guardian/condition-quickness-firebrand-axe-torch-pistol-pistol'),
  build('guard', 'qheal', 'Heal Quickness Firebrand', 'Staff / Axe & Shield', 'guardian/heal-quickness-firebrand-staff-axe-shield'),
  // GUARDIAN — Willbender
  build('guard', 'adps', 'Condition Alacrity Willbender', 'Pistol & Pistol / Axe & Torch', 'guardian/condition-alacrity-willbender-pistol-pistol-axe-torch'),
  build('guard', 'cdps', 'Condition Willbender', 'Pistol & Torch / Pistol', 'guardian/condition-willbender-pistol-torch-pistol'),
  build('guard', 'aheal', 'Heal Alacrity Willbender', 'Spear / Staff', 'guardian/heal-alacrity-willbender-spear-staff'),
  build('guard', 'adps', 'Power Alacrity Willbender', 'Greatsword / Sword & Focus', 'guardian/power-alacrity-willbender-greatsword-sword-focus'),
  build('guard', 'adps', 'Power Alacrity Willbender', 'Spear / Greatsword', 'guardian/power-alacrity-willbender-spear-greatsword'),
  build('guard', 'pdps', 'Power Willbender', 'Peitha - Greatsword / Sword & Focus', 'guardian/power-willbender-peitha-greatsword-sword-focus'),
  build('guard', 'pdps', 'Power Willbender', 'Spear / Greatsword', 'guardian/power-willbender-spear-greatsword'),
  // GUARDIAN — Luminary
  build('guard', 'kiter', 'Hand Kite Luminary', 'Mace & Shield / Mace & Focus', 'guardian/hand-kite-luminary-mace-shield-mace-focus'),
  build('guard', 'aheal', 'Heal Alacrity Luminary', 'Spear / Staff', 'guardian/heal-alacrity-luminary-spear-staff'),
  build('guard', 'adps', 'Power Alacrity Luminary', 'Spear / Greatsword', 'guardian/power-alacrity-luminary-spear-greatsword'),
  build('guard', 'adps', 'Power Alacrity Luminary', 'Longbow / Greatsword', 'guardian/power-alacrity-luminary-longbow-greatsword'),
  build('guard', 'pdps', 'Power Luminary', 'Spear / Greatsword', 'guardian/power-luminary-spear-greatsword'),
  build('guard', 'pdps', 'Power Luminary', 'Longbow / Greatsword', 'guardian/power-luminary-longbow-greatsword'),

  // MESMER — Chronomancer
  build('mes', 'qdps', 'Condition Quickness Chronomancer', 'Staff / Scepter & Torch', 'mesmer/condition-boon-chronomancer-staff-scepter-torch'),
  build('mes', 'adps', 'Condition Alacrity Chronomancer', 'Staff / Scepter & Torch', 'mesmer/condition-boon-chronomancer-staff-scepter-torch'),
  build('mes', 'cdps', 'Condition Chronomancer', 'Staff / Scepter & Torch', 'mesmer/condition-chronomancer-staff-scepter-torch'),
  build('mes', 'aheal', 'Heal Alacrity Chronomancer', 'Rifle', 'mesmer/heal-boon-chronomancer-rifle-only'),
  build('mes', 'qheal', 'Heal Quickness Chronomancer', 'Rifle', 'mesmer/heal-boon-chronomancer-rifle-only'),
  build('mes', 'adps', 'Power Alacrity Chronomancer', 'Greatsword / Dagger & Sword', 'mesmer/power-boon-chronomancer-greatsword-dagger-sword'),
  build('mes', 'qdps', 'Power Quickness Chronomancer', 'Greatsword / Dagger & Sword', 'mesmer/power-boon-chronomancer-greatsword-dagger-sword'),
  build('mes', 'adps', 'Power Alacrity Chronomancer', 'Spear / Dagger & Sword', 'mesmer/power-boon-chronomancer-spear-dagger-sword'),
  build('mes', 'qdps', 'Power Quickness Chronomancer', 'Spear / Dagger & Sword', 'mesmer/power-boon-chronomancer-spear-dagger-sword'),
  build('mes', 'adps', 'Power Alacrity Chronomancer', 'Greatsword / Spear', 'mesmer/power-boon-chronomancer-greatsword-spear'),
  build('mes', 'qdps', 'Power Quickness Chronomancer', 'Greatsword / Spear', 'mesmer/power-boon-chronomancer-greatsword-spear'),
  build('mes', 'adps', 'Power Alacrity Chronomancer', 'Greatsword / Dagger & Focus', 'mesmer/power-boon-chronomancer-greatsword-dagger-focus'),
  build('mes', 'qdps', 'Power Quickness Chronomancer', 'Greatsword / Dagger & Focus', 'mesmer/power-boon-chronomancer-greatsword-dagger-focus'),
  build('mes', 'pdps', 'Power Chronomancer', 'Greatsword / Dagger & Sword', 'mesmer/power-chronomancer-greatsword-dagger-sword'),
  build('mes', 'pdps', 'Power Chronomancer', 'Spear / Dagger & Sword', 'mesmer/power-chronomancer-spear-dagger-sword'),
  // MESMER — Mirage
  build('mes', 'adps', 'Condition Alacrity Mirage', 'Staff / Axe & Torch', 'mesmer/condition-alacrity-mirage-staff-axe-torch'),
  build('mes', 'adps', 'Condition Alacrity Mirage', 'Staff / Staff', 'mesmer/condition-alacrity-mirage-staff-only'),
  build('mes', 'cdps', 'Condition Mirage', 'Infinite Horizon + Ether - Staff / Axe & Torch', 'mesmer/condition-mirage-ih-ether-staff-axe-torch'),
  build('mes', 'cdps', 'Condition Mirage', 'Infinite Horizon + Oasis - Staff / Axe & Torch', 'mesmer/condition-mirage-ih-oasis-staff-axe-torch'),
  build('mes', 'cdps', 'Condition Mirage', 'Dune Cloak - Staff / Axe & Torch', 'mesmer/condition-mirage-dune-cloak-staff-axe-torch'),
  // MESMER — Virtuoso
  build('mes', 'cdps', 'Condition Virtuoso', 'Dagger & Sword / Focus', 'mesmer/condition-virtuoso-dagger-sword-focus'),
  build('mes', 'pdps', 'Power Virtuoso', 'Spear / Greatsword', 'mesmer/power-virtuoso-spear-greatsword'),
  build('mes', 'pdps', 'Power Virtuoso', 'Greatsword / Dagger & Sword', 'mesmer/power-virtuoso-greatsword-dagger-sword'),
  build('mes', 'pdps', 'Power Virtuoso', 'Spear / Dagger & Sword', 'mesmer/power-virtuoso-spear-dagger-sword'),
  // MESMER — Troubadour
  build('mes', 'qheal', 'Heal Quickness Troubadour', 'Rifle', 'mesmer/heal-quickness-troubadour-rifle-only'),
  build('mes', 'qdps', 'Power Quickness Troubadour', 'Spear / Dagger & Sword', 'mesmer/power-quickness-troubadour-spear-dagger-sword'),
  build('mes', 'qdps', 'Power Quickness Troubadour', 'Spear / Greatsword', 'mesmer/power-quickness-troubadour-spear-greatsword'),
  build('mes', 'pdps', 'Power Troubadour', 'Spear / Greatsword', 'mesmer/power-troubadour-spear-greatsword'),
  build('mes', 'pdps', 'Power Troubadour', 'Spear / Dagger & Sword', 'mesmer/power-troubadour-spear-dagger-sword'),

  // NECROMANCER — Reaper
  build('nec', 'cdps', 'Condition Reaper', 'Spear / Dagger & Sword', 'necromancer/condition-reaper-spear-dagger-sword'),
  build('nec', 'pdps', 'Power Reaper', 'Greatsword / Dagger & Sword', 'necromancer/power-reaper-greatsword-dagger-sword'),
  build('nec', 'pdps', 'Power Reaper', 'Greatsword / Spear', 'necromancer/power-reaper-greatsword-spear'),
  build('nec', 'pdps', 'Power Reaper', 'Greatsword / Sword & Sword', 'necromancer/power-reaper-greatsword-sword-sword'),
  // NECROMANCER — Scourge
  build('nec', 'aheal', 'Celestial Alacrity Scourge', 'Dagger & Torch / Pistol & Warhorn', 'necromancer/celestial-alacrity-scourge-dagger-torch-pistol-warhorn'),
  build('nec', 'adps', 'Condition Alacrity Scourge', 'Scepter & Torch / Pistol', 'necromancer/condition-alacrity-scourge-scepter-torch-pistol'),
  build('nec', 'cdps', 'Condition Scourge', 'Scepter & Torch / Pistol', 'necromancer/condition-scourge-scepter-torch-pistol'),
  build('nec', 'aheal', 'Heal Alacrity Scourge', 'Staff / Dagger & Warhorn', 'necromancer/heal-alacrity-scourge-staff-dagger-warhorn'),
  build('nec', 'aheal', 'Heal Alacrity Scourge', 'Dagger & Torch / Dagger & Warhorn', 'necromancer/heal-alacrity-scourge-dagger-torch-warhorn'),
  build('nec', 'aheal', 'Heal Alacrity Scourge', 'Staff / Dagger & Torch', 'necromancer/heal-alacrity-scourge-staff-dagger-torch'),
  build('nec', 'kiter', 'Kite Scourge (Qadim the Peerless)', 'Scepter & Torch / Pistol', 'necromancer/kite-scourge-qadim-the-peerless'),
  // NECROMANCER — Harbinger
  build('nec', 'cdps', 'Condition Harbinger', 'Pistol & Torch / Scepter & Dagger', 'necromancer/condition-harbinger-pistol-torch-scepter-dagger'),
  build('nec', 'qdps', 'Condition Quickness Harbinger', 'Pistol & Dagger / Scepter & Torch', 'necromancer/condition-quickness-harbinger-pistol-dagger-scepter-torch'),
  build('nec', 'pdps', 'Power Harbinger', 'Greatsword / Spear', 'necromancer/power-harbinger-greatsword-spear'),
  build('nec', 'qdps', 'Power Quickness Harbinger', 'Greatsword / Spear', 'necromancer/power-quickness-harbinger-greatsword-spear'),
  // NECROMANCER — Ritualist
  build('nec', 'qheal', 'Heal Quickness Ritualist', 'Staff / Dagger & Warhorn', 'necromancer/heal-quickness-ritualist-staff-dagger-warhorn'),
  build('nec', 'qdps', 'Power Quickness Ritualist', 'Greatsword / Spear', 'necromancer/power-quickness-ritualist-greatsword-spear'),
  build('nec', 'pdps', 'Power Ritualist', 'Greatsword / Spear', 'necromancer/power-ritualist-greatsword-spear'),

  // ENGINEER — Scrapper
  build('eng', 'qdps', 'Condition Quickness Scrapper', 'Spear', 'engineer/condition-quickness-scrapper-spear'),
  build('eng', 'qheal', 'Heal Quickness Scrapper', 'Mace & Shield', 'engineer/heal-quickness-scrapper-mace-shield'),
  build('eng', 'qheal', 'Heal Quickness Scrapper', 'Shortbow', 'engineer/heal-quickness-scrapper-shortbow'),
  build('eng', 'qdps', 'Power Quickness Scrapper', 'Hammer', 'engineer/power-quickness-scrapper-hammer'),
  build('eng', 'pdps', 'Power Scrapper', 'Hammer', 'engineer/power-scrapper-hammer'),
  // ENGINEER — Holosmith
  build('eng', 'cdps', 'Condition Holosmith', 'Pistol & Pistol', 'engineer/condition-holosmith-pistol-pistol'),
  build('eng', 'pdps', 'Power Holosmith', 'Sword & Pistol / Shield', 'engineer/power-holosmith-sword-pistol'),
  // ENGINEER — Mechanist
  build('eng', 'adps', 'Condition Alacrity Mechanist', 'One Kit - Pistol & Pistol', 'engineer/condition-alacrity-mechanist-one-kit-pistol-pistol'),
  build('eng', 'adps', 'Condition Alacrity Mechanist', 'One Kit - Spear', 'engineer/condition-alacrity-mechanist-one-kit-spear'),
  build('eng', 'adps', 'Condition Alacrity Mechanist', 'Two Kits - Spear', 'engineer/condition-alacrity-mechanist-two-kits-spear'),
  build('eng', 'cdps', 'Condition Mechanist', 'One Kit - Spear', 'engineer/condition-mechanist-one-kit-spear'),
  build('eng', 'cdps', 'Condition Mechanist', 'No Kit - Spear', 'engineer/condition-mechanist-no-kit-spear'),
  build('eng', 'cdps', 'Condition Mechanist', 'Two Kits - Spear', 'engineer/condition-mechanist-two-kits-spear'),
  build('eng', 'kiter', 'Hand Kite Alacrity Mechanist', 'Mace & Shield', 'engineer/hand-kite-mechanist-mace-shield'),
  build('eng', 'aheal', 'Heal Alacrity Mechanist', 'Shortbow', 'engineer/heal-alacrity-mechanist-shortbow'),
  build('eng', 'aheal', 'Heal Alacrity Mechanist', 'Mace & Shield', 'engineer/heal-alacrity-mechanist-mace-shield'),
  build('eng', 'adps', 'Power Alacrity Mechanist', 'Rifle', 'engineer/power-alacrity-mechanist-rifle'),
  build('eng', 'adps', 'Power Alacrity Mechanist', 'Two Kits - Sword & Pistol / Shield', 'engineer/power-alacrity-mechanist-two-kits-sword-pistol'),
  build('eng', 'pdps', 'Power Mechanist', 'Sword & Pistol / Shield', 'engineer/power-mechanist-sword-pistol'),
  build('eng', 'pdps', 'Power Mechanist', 'Rifle', 'engineer/power-mechanist-rifle'),
  // ENGINEER — Amalgam
  build('eng', 'adps', 'Condition Alacrity Amalgam', 'Steamshrieker - Spear', 'engineer/condition-alacrity-amalgam-steamshrieker-spear'),
  build('eng', 'adps', 'Condition Alacrity Amalgam', 'Two Kits - Spear', 'engineer/condition-alacrity-amalgam-two-kits-spear'),
  build('eng', 'cdps', 'Condition Amalgam', 'Steamshrieker - Spear', 'engineer/condition-amalgam-steamshrieker-spear'),
  build('eng', 'cdps', 'Condition Amalgam', 'Three Kits - Spear', 'engineer/condition-amalgam-three-kits-spear'),
  build('eng', 'aheal', 'Heal Alacrity Amalgam', 'Shortbow', 'engineer/heal-alacrity-amalgam-shortbow'),
  build('eng', 'aheal', 'Heal Alacrity Amalgam', 'Mace & Shield', 'engineer/heal-alacrity-amalgam-mace-shield'),
  build('eng', 'adps', 'Power Alacrity Amalgam', 'Hammer', 'engineer/power-alacrity-amalgam-hammer'),
  build('eng', 'pdps', 'Power Amalgam', 'Double Helix - Hammer', 'engineer/power-amalgam-double-helix-hammer'),
  build('eng', 'pdps', 'Power Amalgam', 'Symbiotic Synergy - Hammer', 'engineer/power-amalgam-hammer'),

  // RANGER — Druid
  build('rang', 'cdps', 'Condition Druid', 'Dagger & Torch / Axe & Dagger', 'ranger/condition-druid-dagger-torch-axe-dagger'),
  build('rang', 'aheal', 'Heal Alacrity Druid', 'Staff / Mace & Warhorn', 'ranger/heal-alacrity-druid-staff-mace-warhorn'),
  // RANGER — Soulbeast
  build('rang', 'cdps', 'Condition Soulbeast', 'Shortbow / Dagger & Dagger', 'ranger/condition-soulbeast-shortbow-dagger-dagger'),
  build('rang', 'kiter', 'Hand Kite Soulbeast', 'Greatsword / Staff', 'ranger/hand-kite-soulbeast-greatsword-staff'),
  build('rang', 'pdps', 'Power Soulbeast', 'Hammer / Sword & Axe', 'ranger/power-soulbeast-hammer-sword-axe'),
  build('rang', 'pdps', 'Power Soulbeast', 'Hammer / Axe & Axe', 'ranger/power-soulbeast-hammer-axe-axe'),
  // RANGER — Untamed
  build('rang', 'qdps', 'Condition Quickness Untamed', 'Axe & Dagger / Dagger & Torch', 'ranger/condition-quickness-untamed-axe-dagger-dagger-torch'),
  build('rang', 'qheal', 'Heal Quickness Untamed', 'Staff / Mace & Warhorn', 'ranger/heal-quickness-untamed-staff-mace-warhorn'),
  build('rang', 'qdps', 'Power Quickness Untamed', 'Beastmastery - Hammer / Sword & Axe', 'ranger/power-quickness-untamed-hammer-sword-axe'),
  build('rang', 'qdps', 'Power Quickness Untamed', 'Nature Magic - Hammer / Sword & Axe', 'ranger/power-quickness-untamed-nature-magic-hammer-sword-axe'),
  build('rang', 'pdps', 'Power Untamed', 'Beastmastery - Hammer / Sword & Axe', 'ranger/power-untamed-beastmastery-hammer-sword-axe'),
  build('rang', 'pdps', 'Power Untamed', 'Hammer / Spear', 'ranger/power-untamed-hammer-spear'),
  // RANGER — Galeshot
  build('rang', 'pdps', 'Power Galeshot', 'Longbow / Axe & Axe', 'ranger/power-galeshot-longbow-axe-axe'),
  build('rang', 'qdps', 'Power Quickness Galeshot', 'Longbow / Axe & Axe', 'ranger/power-quickness-galeshot-longbow-axe-axe'),

  // THIEF — Thief (core)
  build('thief', 'cdps', 'Condition Thief', 'Axe & Dagger', 'thief/condition-thief-axe-dagger-only'),
  // THIEF — Daredevil
  build('thief', 'cdps', 'Condition Daredevil', 'Dagger / Dagger', 'thief/condition-daredevil-dagger-only'),
  build('thief', 'cdps', 'Condition Daredevil', 'Spear / Axe & Dagger', 'thief/condition-daredevil-spear-axe-dagger'),
  build('thief', 'pdps', 'Power Daredevil', 'Dagger & Dagger / Axe & Pistol', 'thief/power-daredevil-dagger-dagger-axe-pistol'),
  build('thief', 'pdps', 'Power Daredevil', 'Staff / Axe & Pistol', 'thief/power-daredevil-staff'),
  build('thief', 'pdps', 'Power Daredevil', 'Sword & Dagger / Axe & Pistol', 'thief/power-daredevil-sword-dagger-axe-pistol'),
  // THIEF — Deadeye
  build('thief', 'qdps', 'Condition Quickness Deadeye', 'Spear', 'thief/condition-quickness-deadeye-spear-only'),
  build('thief', 'kiter', 'Kite Deadeye', 'Qadim the Peerless - Rifle / Spear', 'thief/kite-deadeye-qtp-rifle-spear'),
  build('thief', 'kiter', 'Kite Deadeye', 'Qadim - Spear / Dagger & Dagger', 'thief/kite-deadeye-q-spear-dagger-dagger'),
  build('thief', 'pdps', 'Power Deadeye', 'M7 - Rifle / Dagger & Dagger', 'thief/power-deadeye-m7-rifle-dagger-dagger'),
  build('thief', 'qdps', 'Power Quickness Deadeye', 'Dagger & Dagger', 'thief/power-quickness-deadeye-dagger-only'),
  build('thief', 'qdps', 'Power Quickness Deadeye', 'Spear', 'thief/power-quickness-deadeye-spear-only'),
  build('thief', 'qdps', 'Power Quickness Deadeye', 'Axe & Pistol / Dagger', 'thief/power-quickness-deadeye-axe-pistol-dagger'),
  // THIEF — Specter
  build('thief', 'aheal', 'Celestial Alacrity Specter', 'Scepter & Pistol / Dagger', 'thief/celestial-alacrity-specter-scepter-pistol-dagger'),
  build('thief', 'adps', 'Condition Alacrity Specter', 'Spear / Spear', 'thief/condition-alacrity-specter-spear-only'),
  build('thief', 'adps', 'Condition Alacrity Specter', 'Scepter & Dagger / Scepter & Dagger', 'thief/condition-alacrity-specter-scepter-dagger-dagger'),
  build('thief', 'adps', 'Condition Alacrity Specter', 'Scepter & Pistol / Scepter & Pistol', 'thief/condition-alacrity-specter-scepter-pistol-scepter-pistol'),
  build('thief', 'cdps', 'Condition Specter', 'Scepter & Dagger / Scepter & Dagger', 'thief/condition-specter-scepter-dagger-only'),
  build('thief', 'cdps', 'Condition Specter', 'Spear / Spear', 'thief/condition-specter-spear-only'),
  build('thief', 'aheal', 'Heal Alacrity Specter', 'Scepter & Pistol', 'thief/heal-alacrity-specter-scepter-pistol'),
  // THIEF — Antiquary
  build('thief', 'adps', 'Condition Alacrity Antiquary', 'Spear', 'thief/condition-alacrity-antiquary-spear-only'),
  build('thief', 'adps', 'Condition Alacrity Antiquary', 'Scepter & Dagger', 'thief/condition-alacrity-antiquary-scepter-dagger-only'),
  build('thief', 'cdps', 'Condition Antiquary', 'Spear', 'thief/condition-antiquary-spear-only'),
  build('thief', 'cdps', 'Condition Antiquary', 'Dagger & Dagger', 'thief/condition-antiquary-dagger-only'),
  build('thief', 'cdps', 'Condition Antiquary', 'Scepter & Dagger', 'thief/condition-antiquary-scepter-dagger'),
  build('thief', 'adps', 'Power Alacrity Antiquary', 'Staff / Dagger & Pistol', 'thief/power-alacrity-antiquary-staff-dagger-pistol'),
  build('thief', 'adps', 'Power Alacrity Antiquary', 'Spear / Axe & Pistol', 'thief/power-alacrity-antiquary-spear-axe-pistol'),
  build('thief', 'adps', 'Power Alacrity Antiquary', 'Rifle', 'thief/power-alacrity-antiquary-rifle-only'),
  build('thief', 'pdps', 'Power Antiquary', 'Staff / Dagger & Pistol', 'thief/power-antiquary-staff-dagger-pistol'),
  build('thief', 'pdps', 'Power Antiquary', 'Rifle', 'thief/power-antiquary-rifle-only'),
  build('thief', 'pdps', 'Power Antiquary', 'Spear / Axe & Pistol', 'thief/power-antiquary-spear-axe-pistol'),

  // REVENANT — Herald
  build('rev', 'qdps', 'Condition Quickness Herald', 'Shortbow / Mace & Axe', 'revenant/condition-quickness-herald-shortbow-mace-axe'),
  build('rev', 'qdps', 'Condition Quickness Herald', 'Spear / Mace & Axe', 'revenant/condition-quickness-herald-spear-mace-axe'),
  build('rev', 'qdps', 'Condition Quickness Herald', 'Spear / Spear', 'revenant/condition-quickness-herald-spear-only'),
  build('rev', 'kiter', 'Hand Kite Herald', 'Staff / Scepter & Shield', 'revenant/hand-kite-herald-staff-scepter-shield'),
  build('rev', 'qheal', 'Heal Quickness Herald', 'Staff / Scepter & Shield', 'revenant/heal-quickness-herald-staff-scepter-shield'),
  build('rev', 'pdps', 'Power Herald', 'Staff / Sword & Sword', 'revenant/power-herald-staff-sword-sword'),
  build('rev', 'qdps', 'Power Quickness Herald', 'Greatsword / Sword & Sword', 'revenant/power-quickness-herald-greatsword-sword-sword'),
  build('rev', 'qdps', 'Power Quickness Herald', 'Staff / Sword & Sword', 'revenant/power-quickness-herald-staff-sword-sword'),
  // REVENANT — Renegade
  build('rev', 'adps', 'Condition Alacrity Renegade', 'Shortbow / Mace & Axe', 'revenant/condition-alacrity-renegade-shortbow-mace-axe'),
  build('rev', 'adps', 'Condition Alacrity Renegade', 'Spear / Mace & Axe', 'revenant/condition-alacrity-renegade-spear-mace-axe'),
  build('rev', 'adps', 'Condition Alacrity Renegade', 'Spear / Spear', 'revenant/condition-alacrity-renegade-spear-only'),
  build('rev', 'cdps', 'Condition Renegade', 'Shortbow / Mace & Axe', 'revenant/condition-renegade-shortbow-mace-axe'),
  build('rev', 'cdps', 'Condition Renegade', 'Spear / Mace & Axe', 'revenant/condition-renegade-spear-mace-axe'),
  build('rev', 'cdps', 'Condition Renegade', 'Spear / Spear', 'revenant/condition-renegade-spear-only'),
  build('rev', 'aheal', 'Heal Alacrity Renegade', 'Staff / Scepter & Shield', 'revenant/heal-alacrity-renegade-staff-scepter-shield'),
  build('rev', 'adps', 'Power Alacrity Renegade', 'Greatsword / Sword & Sword', 'revenant/power-alacrity-renegade-greatsword-sword-sword'),
  build('rev', 'adps', 'Power Alacrity Renegade', 'Staff / Sword & Sword', 'revenant/power-alacrity-renegade-staff-sword-sword'),
  build('rev', 'pdps', 'Power Renegade', 'Greatsword / Sword & Sword', 'revenant/power-renegade-greatsword-sword-sword'),
  build('rev', 'pdps', 'Power Renegade', 'Hammer / Sword & Sword', 'revenant/power-renegade-hammer-sword-sword'),
  // REVENANT — Vindicator
  build('rev', 'aheal', 'Heal Alacrity Vindicator', 'Staff / Scepter & Shield', 'revenant/heal-alacrity-vindicator-staff-scepter-shield'),
  build('rev', 'pdps', 'Power Vindicator', 'Greatsword / Sword & Sword', 'revenant/power-vindicator-greatsword-sword-sword'),
  // REVENANT — Conduit
  build('rev', 'cdps', 'Condition Conduit', 'Mistfire - Spear / Mace & Axe', 'revenant/condition-conduit-mistfire-spear-mace-axe'),
  build('rev', 'cdps', 'Condition Conduit', 'Enhanced Embodiment - Spear / Mace & Axe', 'revenant/condition-conduit-spear-mace-axe'),
  build('rev', 'qdps', 'Condition Quickness Conduit', 'Spear / Mace & Axe', 'revenant/condition-quickness-conduit-spear-mace-axe'),
  build('rev', 'qheal', 'Heal Quickness Conduit', 'Staff / Scepter & Shield', 'revenant/heal-quickness-conduit-staff-scepter-shield'),
  build('rev', 'pdps', 'Power Conduit', 'Staff / Sword & Sword', 'revenant/power-conduit-staff-sword-sword'),
  build('rev', 'pdps', 'Power Conduit', 'Greatsword / Scepter & Sword', 'revenant/power-conduit-greatsword-scepter-sword'),
  build('rev', 'qdps', 'Power Quickness Conduit', 'Staff / Sword & Sword', 'revenant/power-quickness-conduit-staff-sword-sword'),
  build('rev', 'qdps', 'Power Quickness Conduit', 'Greatsword / Sword & Sword', 'revenant/power-quickness-conduit-greatsword-sword-sword'),

  // WARRIOR — Warrior (core)
  build('war', 'pdps', 'Power Warrior', 'Sword & Axe / Dagger & Mace', 'warrior/power-warrior-sword-axe-dagger-mace'),
  build('war', 'pdps', 'Power Warrior', 'Mace & Axe / Dagger & Mace', 'warrior/power-warrior-mace-axe-dagger-mace'),
  // WARRIOR — Berserker
  build('war', 'cdps', 'Condition Berserker', 'Longbow / Sword & Torch', 'warrior/condition-berserker-longbow-sword-torch'),
  build('war', 'qdps', 'Condition Quickness Berserker', 'Longbow / Sword & Torch', 'warrior/condition-quickness-berserker-longbow-sword-torch'),
  build('war', 'qheal', 'Heal Quickness Berserker', 'Staff / Mace & Warhorn', 'warrior/heal-quickness-berserker-staff-mace-warhorn'),
  build('war', 'pdps', 'Power Berserker', 'Tactics - Spear / Greatsword', 'warrior/power-berserker-tactics-spear-greatsword'),
  build('war', 'pdps', 'Power Berserker', 'Arms - Axe & Axe / Sword & Mace', 'warrior/power-berserker-axe-axe-sword-mace'),
  build('war', 'pdps', 'Power Berserker', 'Whirlpain - Spear / Greatsword', 'warrior/power-berserker-whirlpain-spear-greatsword'),
  build('war', 'pdps', 'Power Berserker', 'Defense - Hammer / Axe & Mace', 'warrior/power-berserker-hammer-axe-mace'),
  build('war', 'qdps', 'Power Quickness Berserker', 'Tactics - Spear / Greatsword', 'warrior/power-quickness-berserker-tactics-spear-greatsword'),
  build('war', 'qdps', 'Power Quickness Berserker', 'Discipline - Spear / Axe & Axe', 'warrior/power-quickness-berserker-spear-axe-axe'),
  build('war', 'qdps', 'Power Quickness Berserker', 'Discipline - Greatsword / Axe & Axe', 'warrior/power-quickness-berserker-greatsword-axe-axe'),
  // WARRIOR — Spellbreaker
  build('war', 'kiter', 'Hand Kite Spellbreaker', 'Staff / Mace & Shield', 'warrior/hand-kite-spellbreaker-staff-mace-shield'),
  build('war', 'pdps', 'Power Spellbreaker', 'Dagger & Mace / Axe', 'warrior/power-spellbreaker-dagger-mace-dagger-axe'),
  build('war', 'pdps', 'Power Spellbreaker', 'Hammer / Dagger & Mace', 'warrior/power-spellbreaker-hammer-dagger-mace'),
  // WARRIOR — Bladesworn
  build('war', 'adps', 'Power Alacrity Bladesworn', 'Overcharged Cartridges - Sword & Pistol', 'warrior/power-alacrity-bladesworn-overcharged-cartridges-sword-pistol'),
  build('war', 'adps', 'Power Alacrity Bladesworn', 'Signets - Sword & Pistol', 'warrior/power-alacrity-bladesworn-signets-sword-pistol'),
  build('war', 'pdps', 'Power Bladesworn', 'Fierce as Fire - Sword & Pistol', 'warrior/power-bladesworn-faf-sword-pistol'),
  // WARRIOR — Paragon
  build('war', 'cdps', 'Condition Paragon', 'Longbow / Sword & Sword', 'warrior/condition-paragon-longbow-sword-sword'),
  build('war', 'aheal', 'Heal Alacrity Paragon', 'Staff / Mace & Warhorn', 'warrior/heal-alacrity-paragon-staff-mace-warhorn'),
  build('war', 'adps', 'Power Alacrity Paragon', 'Sword & Axe / Dagger & Mace', 'warrior/power-alacrity-paragon-sword-axe-dagger-mace'),
  build('war', 'pdps', 'Power Paragon', 'Sword & Axe / Dagger & Mace', 'warrior/power-paragon-sword-axe-dagger-mace'),
];

export const PROF: Record<ProfessionKey, { name: string; key: string; c: string }> = {
  guard: { name: 'Guardian', key: 'guardian', c: '#48b6d6' },
  rev: { name: 'Revenant', key: 'revenant', c: '#d0503a' },
  war: { name: 'Warrior', key: 'warrior', c: '#d4b13c' },
  eng: { name: 'Engineer', key: 'engineer', c: '#c98a3f' },
  rang: { name: 'Ranger', key: 'ranger', c: '#86b53f' },
  thief: { name: 'Thief', key: 'thief', c: '#c0904f' },
  ele: { name: 'Elementalist', key: 'elementalist', c: '#d65a4a' },
  mes: { name: 'Mesmer', key: 'mesmer', c: '#b15ad6' },
  nec: { name: 'Necromancer', key: 'necromancer', c: '#3fae74' },
};

export const PROF_ORDER: ProfessionKey[] = ['guard', 'rev', 'war', 'eng', 'rang', 'thief', 'ele', 'mes', 'nec'];

export const PROF_BY_API: Record<string, ProfessionKey> = {
  Guardian: 'guard',
  Revenant: 'rev',
  Warrior: 'war',
  Engineer: 'eng',
  Ranger: 'rang',
  Thief: 'thief',
  Elementalist: 'ele',
  Mesmer: 'mes',
  Necromancer: 'nec',
};

export const CAT: Record<BuildCategory, { label: string; group: 'dps' | 'heal' | 'util'; c: string }> = {
  pdps: { label: 'Power DPS', group: 'dps', c: '#d24a3a' },
  cdps: { label: 'Condition DPS', group: 'dps', c: '#e07b2c' },
  qdps: { label: 'Quickness DPS (QDPS)', group: 'dps', c: '#c79a3c' },
  adps: { label: 'Alacrity DPS (ADPS)', group: 'dps', c: '#7fae3f' },
  qheal: { label: 'Quickness Healer', group: 'heal', c: '#5aa97f' },
  aheal: { label: 'Alacrity Healer', group: 'heal', c: '#4f9bc4' },
  tank: { label: 'Tank', group: 'util', c: '#9d77c9' },
  kiter: { label: 'Kiter', group: 'util', c: '#c97fae' },
};

export function buildById(id: string): BuildEntry | undefined {
  return BUILDS.find((b) => b.id === id);
}
