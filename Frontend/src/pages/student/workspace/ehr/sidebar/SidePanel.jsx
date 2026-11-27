/* Right panel beside the activities: Coding (the student codes here while reading the chart on
   the left), Reports (Regulatory · Med/Hx · Clinical), one Visit
   Report tab per encounter sent here from Chart Review ("Display in Chart Sidebar", closable ×),
   and To Do.
   The open tab is controlled by the page (tab / onTab) so "ADD DX", "Fix" and "Go to fix" can open
   Coding; pinned tabs have keys 'pin:<row id>'. coding = the coding panel; todoExtra = the edits
   panel shown under To Do; pinned = Chart Review rows; onUnpin(rowId) closes one.
   Add a report: write it in this folder and add it to REPORTS. */
import { useState } from 'react';
import { asOf } from '../lib/chartText.js';
import { visitModel } from '../lib/visitModel.js';
import { ClinicalReport } from './ClinicalReport.jsx';
import { MedHxReport } from './MedHxReport.jsx';
import { RegulatoryReport } from './RegulatoryReport.jsx';
import { ToDo } from './ToDo.jsx';
import { VisitReport } from './VisitReport.jsx';

const REPORTS = [
  { key: 'reg', label: 'Regulatory', icon: 'bi-journal-check', View: RegulatoryReport },
  { key: 'medhx', label: 'Med/Hx', icon: 'bi-capsule', View: MedHxReport },
  { key: 'clin', label: 'Clinical', icon: 'bi-heart-pulse', View: ClinicalReport },
];
export const SIDE_TABS = ['coding', 'reports', 'todo'];
export const pinKey = (rowId) => 'pin:' + rowId;

export function SidePanel({
  tab,
  onTab,
  coding,
  codingCount,
  codingTone,
  todoExtra,
  onHide,
  pinned = [],
  onUnpin,
  onUseCodes,
  ...props
}) {
  const [report, setReport] = useState(REPORTS[0].key);
  const [at, setAt] = useState(() => new Date());
  const todo = props.errs + props.queries.filter((q) => !q.answered).length;
  const Report = REPORTS.find((r) => r.key === report).View;
  const pinRow = pinned.find((r) => pinKey(r.id) === tab);
  const isVisit = !!pinRow;
  const tabs = [
    { k: 'coding', l: 'Coding', icon: 'bi-upc-scan', n: codingCount, tone: codingTone },
    { k: 'reports', l: 'Reports' },
    ...pinned.map((r) => ({
      k: pinKey(r.id),
      l: 'Visit Report',
      title: [r.when, r.cells.desc].filter(Boolean).join(' · '),
      close: () => onUnpin(r.id),
    })),
    { k: 'todo', l: 'To Do', n: todo, tone: todo ? 'err' : '' },
  ];
  return (
    <aside className={'ehr-sidepanel' + (tab === 'coding' ? ' coding' : '')} aria-label="Sidebar">
      <div className="ehr-sidetabs" role="tablist">
        {tabs.map((t) => (
          <span key={t.k} className={'stab' + (tab === t.k ? ' on' : '') + (t.close ? ' pin' : '')}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === t.k}
              title={t.title || ''}
              onClick={() => onTab(t.k)}
            >
              {t.icon && <i className={'bi ' + t.icon} />} {t.l}
              {t.n ? <span className={'cnt ' + (t.tone || '')}>{t.n}</span> : null}
            </button>
            {t.close && (
              <button
                type="button"
                className="x"
                onClick={t.close}
                aria-label={'Close ' + (t.title || t.l)}
                title="Close"
              >
                <i className="bi bi-x" />
              </button>
            )}
          </span>
        ))}
        <div className="sp" />
        <button
          type="button"
          className="ehr-x"
          onClick={onHide}
          aria-label="Hide sidebar"
          title="Hide sidebar"
        >
          <i className="bi bi-chevron-double-right" />
        </button>
      </div>
      {tab === 'coding' ? (
        <div className="ehr-sidecoding">{coding}</div>
      ) : (
        <>
          {isVisit && (
            <div className="ehr-sidehead">
              <h3>Visit Report</h3>
              {pinRow && (
                <button
                  type="button"
                  className="ehr-x"
                  onClick={() => onUnpin(pinRow.id)}
                  aria-label="Close this visit report"
                  title="Close"
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>
          )}
          <div className="ehr-side-tb">
            <button
              type="button"
              className="ehr-x"
              onClick={() => setAt(new Date())}
              title="Refresh"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
            {tab === 'reports' &&
              REPORTS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className={'seg' + (report === r.key ? ' on' : '')}
                  onClick={() => setReport(r.key)}
                >
                  <i className={'bi ' + r.icon} /> {r.label}
                </button>
              ))}
          </div>
          <p className="ehr-asof" onClick={() => setAt(new Date())}>
            Current as of {asOf(at)}. Click to refresh.
          </p>
          <div className="ehr-side">
            {tab === 'reports' && <Report {...props} />}
            {pinRow && (
              <VisitReport model={visitModel({ ...props, row: pinRow })} onUseCodes={onUseCodes} />
            )}
            {tab === 'todo' && <ToDo {...props} extra={todoExtra} />}
          </div>
        </>
      )}
    </aside>
  );
}
