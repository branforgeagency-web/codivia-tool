import { Tabs, useTabPanel } from '../../../components/ui/Tabs.jsx';
import React from 'react';
import { useState } from 'react';
import { groupSectionsIntoTabs, parseRecordSections } from './recordSections.js';

export function RecordTabs({ chart }) {
  const recordTabs = useTabPanel();
  const tabs = React.useMemo(
    () => groupSectionsIntoTabs(parseRecordSections(chart.record)),
    [chart.record],
  );
  const [active, setActive] = useState(0);
  const bodyRef = React.useRef(null);
  React.useEffect(() => {
    setActive(0);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [chart.id]);
  if (!tabs.length) {
    // fallback: show raw record
    return <div className="record-body">{chart.record}</div>;
  }
  // Tab 0 = "Full Record" (whole chart). Tabs 1..n = one isolated section each.
  const allTabs = [{ tab: 'Full Record', full: true }].concat(tabs);
  const cur = allTabs[Math.min(active, allTabs.length - 1)];
  const pick = (i) => {
    setActive(i);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };
  const renderSections = (sectionList) =>
    sectionList.map((s, si) => (
      <div key={si} className="record-group" style={{ marginBottom: 14 }}>
        {s.head !== 'RECORD' ? <div className="tab-section-title">{s.head}</div> : null}
        <div>{s.body}</div>
      </div>
    ));
  return (
    <>
      <Tabs id={recordTabs.id} label="Chart record" className="chart-tabs" tabClassName="chart-tab"
        value={Math.min(active, allTabs.length - 1)} onChange={pick}
        items={allTabs.map((t, i) => ({ value: i, className: t.full ? 'chart-tab-full' : '',
          label: <>{t.tab}{!t.full && t.sections.length > 1 ? <span className="tdot" /> : null}</> }))} />
      <div
        {...recordTabs.panelProps}
        className={'record-body' + (chart.handwritten ? ' handwritten hw-note' : '')}
        ref={bodyRef}
      >
        {chart.handwritten ? (
          <div className="hw-banner">✎ Scanned — handwritten chart (transcribe from the note)</div>
        ) : null}
        {cur.full // Full Record: everything
          ? tabs.map((t, ti) => <div key={ti}>{renderSections(t.sections)}</div>)
          : renderSections(cur.sections)}
        {/* isolated: only this section */}
      </div>
    </>
  );
}
