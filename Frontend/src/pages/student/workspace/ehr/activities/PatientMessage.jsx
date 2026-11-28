import { ActivityHeader, Card, EhrButton, KvTable, Note, QueryList } from '../ui/index.js';

export function PatientMessage({ clinical, queries, onNew }) {
  const messages = clinical?.patientMessages || [];
  const visits = clinical?.digitalVisits || [];
  const threads = new Map();
  messages.forEach((message, index) => {
    const key = message.thread || index;
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key).push(message);
  });

  return (
    <div className="ehr-act">
      <ActivityHeader title="Patient Message" />
      <Card title="Portal Conversations" icon="bi-envelope">
        {threads.size === 0 && <Note>No portal messages documented for this encounter.</Note>}
        {[...threads].map(([key, thread]) => (
          <details key={`${typeof key}:${key}`} className="ehr-portal-thread" open={threads.size === 1}>
            <summary>{thread.find((message) => message.subject)?.subject || 'Portal conversation'} <small>({thread.length})</small></summary>
            {thread.map((message, index) => (
              <article key={index} className="ehr-portal-message">
                <KvTable rows={[
                  ['From', message.from],
                  ['To', message.to],
                  ['Sent', message.sentAt],
                  ['Category', message.category],
                ]} />
                {message.body && <p>{message.body}</p>}
              </article>
            ))}
          </details>
        ))}
      </Card>
      {visits.length > 0 && (
        <Card title="Digital E/M Documentation" icon="bi-journal-medical">
          <Note>Review the documented assessment, time, and related care against the applicable coding requirements.</Note>
          {visits.map((visit, index) => (
            <div key={index} className="ehr-portal-message">
              <KvTable rows={[
                ['Conversation', (visit.thread && threads.get(visit.thread)?.find((message) => message.subject)?.subject) || visit.thread],
                ['Initiated By', visit.initiatedBy],
                ['Patient Relationship', visit.patientRelationship],
                ['Service Period', visit.period],
                ['Clinician', visit.clinician],
                ['Documented Minutes', visit.minutes],
                ['Assessment and Management', visit.assessment],
                ['Related Care', visit.relatedCare],
              ]} />
            </div>
          ))}
        </Card>
      )}
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
