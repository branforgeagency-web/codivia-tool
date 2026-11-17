/* CODIVIA platform — department icon (Bootstrap Icons) */

// Department key -> Bootstrap Icons name (https://icons.getbootstrap.com)
const DEPT_ICONS = {
  ED_PRO: 'truck-front',
  ED_FAC: 'hospital',
  EM: 'clipboard2-pulse',
  IM: 'lungs',
  FP: 'people-fill',
  ORTHO: 'person-arms-up',
  CARDIO: 'heart-pulse',
  GI: 'capsule',
  OBGYN: 'gender-female',
  DERM: 'droplet-half',
  ANES: 'eyedropper',
  GENSURG: 'scissors',
  PEDS: 'emoji-smile',
  URO: 'droplet',
  ENT: 'ear',
  HEMONC: 'activity',
  IP: 'hospital-fill',
  HCC: 'clipboard-data',
  HH: 'house-heart',
  OP: 'building',
  HOSP: 'heart-fill',
  SNF: 'building-fill-add',
  CDI: 'file-earmark-medical',
  AUDIT: 'shield-check',
  RAD: 'radioactive',
  PATH: 'virus2',
  ANCIL: 'journal-medical',
  IVR: 'bandaid',
  DENIAL: 'arrow-repeat',
  DME: 'person-wheelchair',
};

// Built-in departments use the icon set above; a department an admin created shows its own
// icon (the emoji saved with it), else a generic clipboard.
export function DeptIcon({ dept, icon }) {
  if (!DEPT_ICONS[dept] && icon) return <span className="dept-emoji" aria-hidden="true">{icon}</span>;
  const name = DEPT_ICONS[dept] || 'clipboard2-pulse';
  return <i className={'bi bi-' + name} aria-hidden="true" />;
}
