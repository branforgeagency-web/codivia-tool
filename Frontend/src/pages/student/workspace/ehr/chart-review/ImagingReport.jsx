/* Rad preview: one imaging order and its result. Order header (title [order #], signed / ordering /
   authorized by, status), the result text, then Additional Information, Priority and Order Details,
   Imaging Order Requisition and the order- / encounter-level documents. row.imaging comes from
   chartReviewData.js (imagingOf). */
import { useState } from 'react';
import { ReportView } from '../ui/index.js';

function Section({ title, icon, children }) {
  return (
    <section className="img-sec">
      <h3>
        {icon && <i className={'bi ' + icon} />} {title}
      </h3>
      {children}
    </section>
  );
}

export function ImagingReport({ row, find, onViewEncounter }) {
  const o = row.imaging;
  const [details, setDetails] = useState(false);
  const title = row.cells.desc;
  return (
    <div className="ehr-imaging">
      <div className="img-head">
        <h2>
          {title} <span>[{o.orderId}]</span>
        </h2>
        <div className="img-meta">
          <div>
            Electronically signed by: <b>{o.signedBy || '—'}</b>
            {o.orderDate && <> on {o.orderDate}</>}
          </div>
          <div>
            Status: <b>{o.status}</b>
          </div>
          <div>
            Ordering user: {o.orderedBy || '—'} {o.orderDate}
          </div>
          <div>Authorized by: {o.authorizedBy || '—'}</div>
        </div>
      </div>

      <ReportView sections={row.sections} find={find} />

      <Section title="Additional Information">
        <div className="img-cols">
          <div>
            <small>Associated Reports</small>
            {onViewEncounter ? (
              <button type="button" className="ehr-link" onClick={onViewEncounter}>
                View Encounter
              </button>
            ) : (
              <span>None</span>
            )}
          </div>
          <div>
            <small>External References</small>
            <span>None</span>
          </div>
        </div>
        <button
          type="button"
          className="ehr-link"
          onClick={() => setDetails(!details)}
          aria-expanded={details}
        >
          Priority and Order Details
        </button>
        {details && (
          <div className="ehr-detail">
            {[
              ['Priority', o.priority],
              ['Order #', o.orderId],
              ['Order Date', o.orderDate],
              ['Ordering Provider', o.orderedBy],
              ['Authorizing Provider', o.authorizedBy],
              ['Order Status', o.status],
            ]
              .filter(([, v]) => v)
              .map(([l, v]) => (
                <div key={l} className="row">
                  <span>{l}:</span>
                  <b>{v}</b>
                </div>
              ))}
          </div>
        )}
      </Section>

      <Section title="Imaging Order Requisition">
        <p className="img-link">
          {title} (Order #{o.orderId}){o.orderDate && <> on {o.orderDate}</>}
        </p>
      </Section>
      <Section title="Order-Level Documents:" icon="bi-file-earmark">
        <p>There are no order-level documents.</p>
      </Section>
      <Section title="Encounter-Level Documents:" icon="bi-file-earmark">
        {onViewEncounter ? (
          <button type="button" className="ehr-link" onClick={onViewEncounter}>
            Progress Notes
          </button>
        ) : (
          <p>There are no encounter-level documents.</p>
        )}
      </Section>
    </div>
  );
}
