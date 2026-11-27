/* Sidebar › Reports › Clinical: this visit's vitals, labs and imaging. */
import {
  sectionsMatching,
  sectionsText,
  visitSections,
  VITAL_LIST,
  vitalsOf,
} from '../lib/chartText.js';
import { NoData, SideCard } from '../ui/index.js';

export function ClinicalReport({ docs }) {
  const secs = visitSections(docs);
  const vit = vitalsOf(sectionsText(secs));
  return (
    <>
      <SideCard title="Vitals">
        {Object.keys(vit).length ? (
          VITAL_LIST.filter((v) => vit[v.key]).map((v) => (
            <div key={v.key} className="ehr-li">
              <span className="k">{v.label}</span> {vit[v.key]}
            </div>
          ))
        ) : (
          <NoData />
        )}
      </SideCard>
      {sectionsMatching(secs, /LAB|PATHOLOG|IMAGING|RADIOLOG|DIAGNOSTIC/i).map((s, i) => (
        <SideCard key={i} title={s.head}>
          <p className="ehr-small pre">{s.body}</p>
        </SideCard>
      ))}
    </>
  );
}
