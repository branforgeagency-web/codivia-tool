import { useState } from 'react';
import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { DEPTS } from '../../config/constants.js';
import { deptHasCharts } from '../../utils/allocation.js';
import { useAdmin } from '../../context/AdminContext.jsx';

// ---- Admin: browse & preview the actual charts in each department ----
export function AdminCharts({ onView }) {
  const [dept, setDept] = useState(null);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(50);

  if (!dept) {
    return (
      <div>
        <div className="page-head">
          <h1>Browse Charts</h1>
          <p>
            Open any department to review its charts — read the record and check the answer key.
          </p>
        </div>
        <div className="dept-grid">
          {Object.entries(DEPTS)
            .filter(([dk]) => deptHasCharts(dk))
            .map(([dk, d]) => {
              const total = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
              return (
                <div
                  key={dk}
                  className="dept-card"
                  onClick={() => {
                    setDept(dk);
                    setQ('');
                    setShown(50);
                  }}
                >
                  <div className="ico">{d.icon}</div>
                  <h3>{d.name}</h3>
                  <ElementTiles dept={d} setting={d.group === 'setting'} />
                  <div className="alloc">
                    <span>Charts</span>
                    <b>{total}</b>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                    Click to browse
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  const d = DEPTS[dept];
  const charts = (window.CHART_DATA && window.CHART_DATA[dept]) || [];
  const filtered = q.trim()
    ? charts.filter((c) =>
        (
          c.title +
          ' ' +
          c.id +
          ' ' +
          c.patient.name +
          ' ' +
          ((c.answerKey[0] && c.answerKey[0].code) || '')
        )
          .toLowerCase()
          .includes(q.toLowerCase().trim()),
      )
    : charts;
  const visible = filtered.slice(0, shown);

  return (
    <div>
      <button className="backbtn" onClick={() => setDept(null)}>
        ← All departments
      </button>
      <div className="page-head">
        <h1>{d.icon + ' ' + d.name}</h1>
        <p>{charts.length + ' charts in this department'}</p>
      </div>
      <div className="card">
        <div
          className="card-h"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h3>Charts</h3>
          <input
            value={q}
            placeholder="Search title, ID, code, patient…"
            style={{
              fontSize: 12,
              padding: '6px 10px',
              border: '1px solid var(--line)',
              borderRadius: 6,
              minWidth: 240,
            }}
            onChange={(ev) => {
              setQ(ev.target.value);
              setShown(50);
            }}
          />
        </div>
        <table>
          <thead>
            <tr>
              {['Chart', 'Patient', 'Answer Key', 'Level', 'Action'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const keyStr = c.answerKey.map((a) => a.code).join(', ');
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {c.id}
                      {c.handwritten ? (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--tone-9a6b12)',
                            background: 'var(--tone-fff2cf)',
                            border: '1px solid var(--tone-e3bd5c)',
                            borderRadius: 4,
                            padding: '1px 5px',
                          }}
                        >
                          ✎ HANDWRITTEN
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {c.patient.name}
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {c.patient.sex + ' · ' + c.patient.age + 'y'}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-d)' }}>
                      {keyStr}
                    </span>
                  </td>
                  <td>
                    <span className={'badge ' + c.difficulty}>{c.difficulty}</span>
                  </td>
                  <td>
                    <button className="btn btn-teal" onClick={() => onView(c)}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown < filtered.length ? (
          <div style={{ textAlign: 'center', padding: '14px' }}>
            <button className="btn btn-ghost" onClick={() => setShown(shown + 50)}>
              {'Show more (' + (filtered.length - shown) + ' remaining)'}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '14px', color: 'var(--muted)', fontSize: 13 }}
          >
            No charts match your search.
          </div>
        ) : null}
      </div>
    </div>
  );
}

// route: /admin/charts
export default function ChartsPage() {
  const { setBrowseChart } = useAdmin();
  return <AdminCharts onView={(c) => setBrowseChart(c)} />;
}
