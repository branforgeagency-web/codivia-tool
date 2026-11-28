import { useState } from 'react';
import { synopsisData, synopsisTime } from '../lib/synopsis.js';
import { Card, EhrTable, Note } from '../ui/index.js';

const DAY = 86400000;
const seriesKey = ({ kind, name, unit }) => JSON.stringify([kind, name.toLowerCase(), unit]);
const byDate = (a, b) => (a.time ?? Infinity) - (b.time ?? Infinity);
const numeric = (value) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim());

function Trend({ readings, marker, label }) {
  const points = readings.filter(({ time, value }) => time !== null && numeric(value));
  if (!points.length) return <Note>No dated numeric readings to plot for this measure.</Note>;

  const times = points.map(({ time }) => time);
  if (marker) times.push(marker.time);
  const start = Math.min(...times);
  const end = Math.max(...times);
  const values = points.map(({ value }) => Number(value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (time) => (start === end ? 330 : 66 + ((time - start) / (end - start)) * 514);
  const y = (value) => (min === max ? 88 : 150 - ((value - min) / (max - min)) * 124);
  const day = (time) => new Date(time).toISOString().slice(0, 10);

  return (
    <figure className="ehr-synopsis-trend">
      <svg
        viewBox="0 0 610 187"
        role="img"
        aria-label={`${label} over time. Exact readings are in the table below.`}
      >
        <path d="M66 26V150H580" fill="none" stroke="#708095" />
        <text x="60" y={min === max ? 92 : 30} textAnchor="end">
          {max}
        </text>
        {min !== max && (
          <text x="60" y="154" textAnchor="end">
            {min}
          </text>
        )}
        <text x="66" y="176">
          {day(start)}
        </text>
        {start !== end && (
          <text x="580" y="176" textAnchor="end">
            {day(end)}
          </text>
        )}
        {marker && (
          <line
            x1={x(marker.time)}
            x2={x(marker.time)}
            y1="26"
            y2="150"
            stroke="#a85418"
            strokeDasharray="5 4"
          />
        )}
        <polyline
          points={points.map(({ time, value }) => `${x(time)},${y(value)}`).join(' ')}
          fill="none"
          stroke="#2469a0"
          strokeWidth="2"
        />
        {points.map(({ time, value, date }, index) => (
          <circle key={index} cx={x(time)} cy={y(value)} r="4" fill="#2469a0">
            <title>{`${date} · ${value}`}</title>
          </circle>
        ))}
      </svg>
      {marker && (
        <figcaption>
          Dashed line marks {marker.name} starting on {marker.date}.
        </figcaption>
      )}
    </figure>
  );
}

export function SynopsisHistory({ chart, docs }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [measure, setMeasure] = useState('');
  const [medication, setMedication] = useState('');
  const { observations, events } = synopsisData(chart, docs);
  const fromTime = synopsisTime(from);
  const toTime = synopsisTime(to);
  const inRange = ({ time }) =>
    (!from && !to) ||
    (time !== null &&
      (fromTime === null || time >= fromTime) &&
      (toTime === null || time < toTime + DAY));
  const series = new Map(
    observations.map((row) => [
      seriesKey(row),
      `${row.kind} · ${row.name}${row.unit ? ` (${row.unit})` : ''}`,
    ]),
  );
  const selected = series.has(measure)
    ? measure
    : seriesKey(
        observations.find(({ time, value }) => time !== null && numeric(value)) ||
          observations[0] || { kind: '', name: '', unit: '' },
      );
  const readings = observations
    .filter((row) => seriesKey(row) === selected && inRange(row))
    .sort(byDate);
  const timeline = events.filter(inRange).sort(byDate);
  const starts = timeline.filter(({ kind, time }) => kind === 'Medication start' && time !== null);
  const marker = starts.find((row) => JSON.stringify([row.name, row.date]) === medication);

  return (
    <>
      <Card title="Clinical History" icon="bi-calendar-range">
        <div className="ehr-synopsis-controls">
          <label>
            From{' '}
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            Through{' '}
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          {(from || to) && (
            <button
              className="ehr-btn"
              type="button"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              Clear dates
            </button>
          )}
        </div>
        {from && to && from > to && <Note>Choose a start date on or before the end date.</Note>}
      </Card>
      <Card title="Measurement Trends" icon="bi-graph-up">
        {series.size > 0 && (
          <div className="ehr-synopsis-controls">
            <label>
              Measure{' '}
              <select value={selected} onChange={(event) => setMeasure(event.target.value)}>
                {[...series].map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {starts.length > 0 && (
              <label>
                Compare with medication start{' '}
                <select
                  value={marker ? medication : ''}
                  onChange={(event) => setMedication(event.target.value)}
                >
                  <option value="">None</option>
                  {starts.map((row, index) => (
                    <option key={index} value={JSON.stringify([row.name, row.date])}>
                      {row.name} · {row.date}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {readings.length > 0 && (
          <Trend readings={readings} marker={marker} label={series.get(selected)} />
        )}
        <EhrTable
          cols={['Recorded', 'Value', 'Unit', 'Details']}
          count={readings.length}
          empty="No readings for this selection."
        >
          {readings.map((row, index) => (
            <tr key={index}>
              <td>{row.date || 'Undated'}</td>
              <td>{row.value}</td>
              <td>{row.unit || '—'}</td>
              <td>{row.detail || '—'}</td>
            </tr>
          ))}
        </EhrTable>
      </Card>
      <Card title="Medication, Treatment & Procedure Timeline" icon="bi-clock-history">
        <EhrTable
          cols={['Date', 'Event', 'Name', 'Details']}
          count={timeline.length}
          empty="No timeline events for this selection."
        >
          {timeline.map((row, index) => (
            <tr key={index}>
              <td>{row.date || 'Undated'}</td>
              <td>{row.kind}</td>
              <td>{row.name}</td>
              <td>{row.detail || '—'}</td>
            </tr>
          ))}
        </EhrTable>
      </Card>
    </>
  );
}
