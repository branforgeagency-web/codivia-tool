/* Patient Message: practice charts have no patient-portal messages; the physician queries a coder
   sends are the chart's messages, so they are listed here too. */
import { ActivityHeader, Card, EhrButton, Note, QueryList } from '../ui/index.js';

export function PatientMessage({ queries, onNew }) {
  return (
    <div className="ehr-act">
      <ActivityHeader title="Patient Message" />
      <Card title="Patient Messages" icon="bi-envelope">
        <Note>No patient messages for this encounter.</Note>
      </Card>
      <Card
        title={`Physician Queries (${queries.length})`}
        icon="bi-chat-left-dots"
        action={
          <EhrButton icon="bi-plus-lg" onClick={onNew}>
            New query
          </EhrButton>
        }
      >
        <QueryList queries={queries} who={(q) => q.to || 'Physician'} />
      </Card>
    </div>
  );
}
